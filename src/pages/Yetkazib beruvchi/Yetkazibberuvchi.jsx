import React, { useMemo, useState, useCallback } from "react";
import {
  Table,
  Input,
  Button,
  Drawer,
  Descriptions,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  InputNumber,
  message,
  Statistic,
  Row,
  Col,
  Card,
} from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import {
  useGetClientsQuery,
  usePayClientDebtMutation,
} from "../../context/service/client.service";

const { Title, Text } = Typography;

const formatMoney = (n) =>
  new Intl.NumberFormat("ru-RU").format(Number(n || 0));

const calcTotalFromHistory = (history = []) =>
  history.reduce((sum, h) => sum + Number(h.remaining_debt || 0), 0);

const Yetkazibberuvchi = () => {
  const { data: clientsResponse, isLoading, refetch } = useGetClientsQuery();
  const [payDebt, { isLoading: paying }] = usePayClientDebtMutation();

  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm] = Form.useForm();

  // API javobini parse qilish va supplier'larni olish
  const suppliers = useMemo(() => {
    let allClients = [];

    if (!clientsResponse) return [];

    if (Array.isArray(clientsResponse)) {
      allClients = clientsResponse;
    } else if (
      clientsResponse.clients &&
      Array.isArray(clientsResponse.clients)
    ) {
      allClients = clientsResponse.clients;
    } else if (clientsResponse.data && Array.isArray(clientsResponse.data)) {
      allClients = clientsResponse.data;
    }

    // Supplier'larni filtrlash (type mavjud yoki supplier_debt_history bor)
    const supplierList = allClients.filter((c) => {
      // Agar type aniq supplier bo'lsa
      if (c.type === "supplier") return true;

      // Agar type yo'q lekin supplier_debt_history mavjud bo'lsa
      if (!c.type && c.supplier_debt_history !== undefined) return true;

      // Agar customer emas va type yo'q bo'lsa (default supplier)
      if (c.type !== "customer" && !c.type) return true;

      return false;
    });

    if (!search.trim()) return supplierList;

    // Qidiruv
    const s = search.trim().toLowerCase();
    return supplierList.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(s) ||
        (c.phone || "").toLowerCase().includes(s) ||
        (c.address || "").toLowerCase().includes(s)
      );
    });
  }, [clientsResponse, search]);

  // Umumiy statistika
  const statistics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalDebt = suppliers.reduce((sum, s) => {
      return sum + calcTotalFromHistory(s.supplier_debt_history);
    }, 0);
    const suppliersWithDebt = suppliers.filter(
      (s) => calcTotalFromHistory(s.supplier_debt_history) > 0
    ).length;

    return { totalSuppliers, totalDebt, suppliersWithDebt };
  }, [suppliers]);

  const openSupplier = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedSupplier(null);
  }, []);

  const openPayModal = useCallback(() => {
    if (!selectedSupplier?._id) return;
    const supplierTotal = calcTotalFromHistory(
      selectedSupplier.supplier_debt_history
    );
    payForm.setFieldsValue({
      amount: supplierTotal > 0 ? supplierTotal : 0,
    });
    setPayModalOpen(true);
  }, [selectedSupplier, payForm]);

  const handlePaySubmit = useCallback(
    async (values) => {
      try {
        await payDebt({
          id: selectedSupplier._id,
          amount: Number(values.amount),
        }).unwrap();

        message.success(
          `${formatMoney(
            values.amount
          )} so'm to'lov muvaffaqiyatli amalga oshirildi`
        );
        setPayModalOpen(false);
        payForm.resetFields();
        await refetch();

        // Drawer'dagi ma'lumotni yangilash
        const updatedSuppliers = await refetch();
        const updated = updatedSuppliers?.data?.clients?.find(
          (c) => c._id === selectedSupplier._id
        );
        if (updated) {
          setSelectedSupplier(updated);
        }
      } catch (e) {
        console.error("Payment error:", e);
        message.error(e?.data?.message || "To'lovda xatolik yuz berdi");
      }
    },
    [payDebt, selectedSupplier, payForm, refetch]
  );

  // Jadval ustunlari
  const columns = useMemo(
    () => [
      {
        title: "№",
        key: "index",
        width: 50,
        render: (_, __, index) => index + 1,
      },
      {
        title: "Yetkazib beruvchi",
        dataIndex: "name",
        key: "name",
        render: (v) => <Text strong>{v || "-"}</Text>,
      },
      {
        title: "Telefon",
        dataIndex: "phone",
        key: "phone",
        render: (v) => v || "-",
      },
      {
        title: "Manzil",
        dataIndex: "address",
        key: "address",
        render: (v) => v || "-",
        ellipsis: true,
      },
      {
        title: "Qarz",
        key: "debt",
        align: "right",
        render: (_, supplier) => {
          const total = calcTotalFromHistory(supplier.supplier_debt_history);
          const currency =
            supplier.supplier_debt_history?.[0]?.currency || "sum";
          return (
            <Text type={total > 0 ? "danger" : "success"} strong>
              {formatMoney(total)} {currency.toUpperCase()}
            </Text>
          );
        },
      },
      {
        title: "Amallar",
        key: "actions",
        width: 120,
        align: "center",
        render: (_, supplier) => (
          <Button
            type="primary"
            onClick={() => openSupplier(supplier)}
            size="small"
          >
            Ko'rish
          </Button>
        ),
      },
    ],
    [openSupplier]
  );

  // Qarz tarixi jadval ustunlari
  const debtColumns = useMemo(
    () => [
      {
        title: "Mahsulot",
        dataIndex: "product_name",
        key: "product_name",
        render: (v) => <Text strong>{v || "-"}</Text>,
      },
      {
        title: "Miqdor",
        dataIndex: "quantity",
        key: "quantity",
        align: "center",
        render: (v) => formatMoney(v),
      },
      {
        title: "Narx (dona)",
        dataIndex: "price_per_item",
        key: "price_per_item",
        align: "right",
        render: (v, r) =>
          `${formatMoney(v)} ${(r.currency || "sum").toUpperCase()}`,
      },
      {
        title: "Umumiy",
        dataIndex: "total_price",
        key: "total_price",
        align: "right",
        render: (v, r) => (
          <Text strong>
            {formatMoney(v)} {(r.currency || "sum").toUpperCase()}
          </Text>
        ),
      },
      {
        title: "To'langan",
        dataIndex: "paid_amount",
        key: "paid_amount",
        align: "right",
        render: (v, r) => (
          <Text type="success">
            {formatMoney(v)} {(r.currency || "sum").toUpperCase()}
          </Text>
        ),
      },
      {
        title: "Qarz",
        dataIndex: "remaining_debt",
        key: "remaining_debt",
        align: "right",
        render: (v, r) => (
          <Text type={Number(v) > 0 ? "danger" : "success"} strong>
            {formatMoney(v)} {(r.currency || "sum").toUpperCase()}
          </Text>
        ),
      },
      {
        title: "Izoh",
        dataIndex: "note",
        key: "note",
        render: (v) => v || "-",
        ellipsis: true,
      },
      {
        title: "Sana",
        dataIndex: "created_at",
        key: "created_at",
        width: 150,
        render: (v) =>
          v
            ? new Date(v).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
      },
    ],
    []
  );

  const supplierHistory = selectedSupplier?.supplier_debt_history || [];
  const supplierTotal = calcTotalFromHistory(supplierHistory);
  const currency = (supplierHistory?.[0]?.currency || "sum").toUpperCase();

  return (
    <div
      style={{ padding: 24, backgroundColor: "#f0f2f5", minHeight: "100vh" }}
    >
      <Title level={2} style={{ marginBottom: 24 }}>
        Yetkazib beruvchilar
      </Title>

      {/* Statistika kartochkalari */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Jami yetkazib beruvchilar"
              value={statistics.totalSuppliers}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Qarzli yetkazib beruvchilar"
              value={statistics.suppliersWithDebt}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Umumiy qarz"
              value={formatMoney(statistics.totalDebt)}
              suffix="SO'M"
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Qidiruv va yangilash */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" style={{ width: "100%" }}>
          <Input
            placeholder="Ism, telefon yoki manzil bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 400 }}
            size="large"
          />
          <Button size="large" onClick={refetch} loading={isLoading}>
            Yangilash
          </Button>
        </Space>
      </Card>

      {/* Jadval */}
      <Card>
        <Table
          rowKey="_id"
          loading={isLoading}
          columns={columns}
          dataSource={suppliers}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Jami: ${total} ta`,
          }}
          locale={{
            emptyText: "Yetkazib beruvchilar topilmadi",
          }}
          bordered
        />
      </Card>

      {/* SUPPLIER DETAIL DRAWER */}
      <Drawer
        title={
          <Space>
            <ShoppingOutlined />
            <span>Yetkazib beruvchi ma'lumotlari</span>
          </Space>
        }
        width={1000}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {selectedSupplier && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions bordered size="middle" column={2}>
                <Descriptions.Item label="Nomi" span={2}>
                  <Text strong style={{ fontSize: 18 }}>
                    {selectedSupplier.name}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Telefon">
                  <Text copyable>{selectedSupplier.phone || "-"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Manzil">
                  {selectedSupplier.address || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Turi">
                  <Tag color="blue" icon={<ShoppingOutlined />}>
                    Yetkazib beruvchi
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Qarz holati">
                  {supplierTotal > 0 ? (
                    <Tag color="red" icon={<DollarOutlined />}>
                      Qarz mavjud
                    </Tag>
                  ) : (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Qarz yo'q
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Umumiy qarz" span={2}>
                  <Text
                    type={supplierTotal > 0 ? "danger" : "success"}
                    strong
                    style={{ fontSize: 24 }}
                  >
                    {formatMoney(supplierTotal)} {currency}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {supplierTotal > 0 && (
              <Space style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={openPayModal}
                  icon={<DollarOutlined />}
                >
                  To'lov qilish
                </Button>
              </Space>
            )}

            <Card
              title={
                <Space>
                  <Title level={4} style={{ margin: 0 }}>
                    Qarz tarixi
                  </Title>
                  <Tag color="blue">{supplierHistory.length} ta</Tag>
                </Space>
              }
            >
              <Table
                rowKey="_id"
                columns={debtColumns}
                dataSource={supplierHistory}
                pagination={{ pageSize: 10 }}
                size="small"
                locale={{
                  emptyText: "Qarz tarixi mavjud emas",
                }}
                bordered
              />
            </Card>
          </>
        )}
      </Drawer>

      {/* PAY DEBT MODAL */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: "#1890ff" }} />
            <span>Yetkazib beruvchiga to'lov qilish</span>
          </Space>
        }
        open={payModalOpen}
        onCancel={() => {
          setPayModalOpen(false);
          payForm.resetFields();
        }}
        onOk={() => payForm.submit()}
        confirmLoading={paying}
        destroyOnClose
        okText="To'lash"
        cancelText="Bekor qilish"
        width={500}
      >
        <Form
          form={payForm}
          layout="vertical"
          onFinish={handlePaySubmit}
          style={{ marginTop: 20 }}
        >
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Yetkazib beruvchi">
              <Text strong>{selectedSupplier?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Telefon">
              {selectedSupplier?.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Umumiy qarz">
              <Text type="danger" strong style={{ fontSize: 18 }}>
                {formatMoney(supplierTotal)} {currency}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Form.Item
            name="amount"
            label="To'lov summasi"
            style={{ marginTop: 20 }}
            rules={[
              { required: true, message: "Summani kiriting!" },
              {
                type: "number",
                min: 1,
                max: supplierTotal,
                message: `1 dan ${formatMoney(
                  supplierTotal
                )} gacha bo'lishi kerak`,
              },
            ]}
          >
            <InputNumber
              min={1}
              max={supplierTotal}
              style={{ width: "100%" }}
              size="large"
              placeholder={`Maksimal: ${formatMoney(supplierTotal)}`}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(value) => value.replace(/\s/g, "")}
              addonAfter={currency}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Yetkazibberuvchi;
