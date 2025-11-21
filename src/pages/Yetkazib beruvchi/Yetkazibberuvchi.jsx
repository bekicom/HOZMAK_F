import React, { useMemo, useState, useCallback } from "react";
import {
  Table,
  Input,
  Button,
  Drawer,
  Descriptions,
  Tag,
  Tabs,
  Space,
  Typography,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
} from "antd";

import {
  useGetClientsQuery,
  usePayClientDebtMutation,
} from "../../context/service/client.service";

const { Title, Text } = Typography;
const { Option } = Select;

const formatMoney = (n) =>
  new Intl.NumberFormat("ru-RU").format(Number(n || 0));

const calcTotalFromHistory = (history = []) =>
  history.reduce((sum, h) => sum + Number(h.remaining_debt || 0), 0);

const Yetkazibberuvchi = () => {
  const { data, isLoading, refetch } = useGetClientsQuery();
  const [payDebt, { isLoading: paying }] = usePayClientDebtMutation();

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm] = Form.useForm();

  const clients = useMemo(() => {
    const list = data?.clients || data?.data || data || [];
    if (!search.trim()) return list;

    const s = search.trim().toLowerCase();
    return list.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(s) ||
        (c.phone || "").toLowerCase().includes(s)
      );
    });
  }, [data, search]);

  const openClient = useCallback((client) => {
    setSelectedClient(client);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedClient(null);
  }, []);

  const openPayModal = useCallback(
    (side) => {
      if (!selectedClient?._id) return;
      payForm.setFieldsValue({
        side,
        amount: 0,
      });
      setPayModalOpen(true);
    },
    [selectedClient, payForm]
  );

  const handlePaySubmit = useCallback(
    async (values) => {
      try {
        await payDebt({
          id: selectedClient._id,
          side: values.side, // "customer" yoki "supplier"
          amount: Number(values.amount),
        }).unwrap();

        message.success("To‘lov qabul qilindi");
        setPayModalOpen(false);
        payForm.resetFields();
        refetch();
      } catch (e) {
        message.error(e?.data?.message || "To‘lovda xatolik");
      }
    },
    [payDebt, selectedClient, payForm, refetch]
  );

  const columns = [
    {
      title: "Ism",
      dataIndex: "name",
      key: "name",
      render: (v) => <Text strong>{v}</Text>,
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
    },
    {
      title: "Turi",
      dataIndex: "type",
      key: "type",
      render: (t) =>
        t === "supplier" ? (
          <Tag color="blue">Supplier</Tag>
        ) : (
          <Tag color="green">Customer</Tag>
        ),
    },
    {
      title: "Customer qarzi (history)",
      key: "customerDebt",
      render: (_, c) => {
        const total = calcTotalFromHistory(c.customer_debt_history);
        return (
          <Text type={total > 0 ? "danger" : undefined}>
            {formatMoney(total)} {c.customer_debt_history?.[0]?.currency || ""}
          </Text>
        );
      },
    },
    {
      title: "Supplier qarzi (history)",
      key: "supplierDebt",
      render: (_, c) => {
        const total = calcTotalFromHistory(c.supplier_debt_history);
        return (
          <Text type={total > 0 ? "danger" : undefined}>
            {formatMoney(total)} {c.supplier_debt_history?.[0]?.currency || ""}
          </Text>
        );
      },
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, c) => (
        <Space>
          <Button onClick={() => openClient(c)}>Ko‘rish</Button>
        </Space>
      ),
    },
  ];

  const debtColumns = [
    { title: "Mahsulot", dataIndex: "product_name", key: "product_name" },
    { title: "Miqdor", dataIndex: "quantity", key: "quantity" },
    {
      title: "Narx (1 dona)",
      dataIndex: "price_per_item",
      key: "price_per_item",
      render: (v, r) => `${formatMoney(v)} ${r.currency}`,
    },
    {
      title: "Umumiy narx",
      dataIndex: "total_price",
      key: "total_price",
      render: (v, r) => `${formatMoney(v)} ${r.currency}`,
    },
    {
      title: "To‘langan",
      dataIndex: "paid_amount",
      key: "paid_amount",
      render: (v, r) => `${formatMoney(v)} ${r.currency}`,
    },
    {
      title: "Qolgan qarz",
      dataIndex: "remaining_debt",
      key: "remaining_debt",
      render: (v, r) => (
        <Text type={Number(v) > 0 ? "danger" : undefined}>
          {formatMoney(v)} {r.currency}
        </Text>
      ),
    },
    {
      title: "Izoh",
      dataIndex: "note",
      key: "note",
      render: (v) => v || "-",
    },
    {
      title: "Sana",
      dataIndex: "created_at",
      key: "created_at",
      render: (v) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  const customerHistory = selectedClient?.customer_debt_history || [];
  const supplierHistory = selectedClient?.supplier_debt_history || [];

  const customerTotal = calcTotalFromHistory(customerHistory);
  const supplierTotal = calcTotalFromHistory(supplierHistory);

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ marginBottom: 12 }}>
        Clientlar
      </Title>

      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Search: ism yoki telefon"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Button onClick={refetch}>Yangilash</Button>
      </Space>

      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={clients}
        pagination={{ pageSize: 10 }}
      />

      {/* CLIENT DETAIL DRAWER */}
      <Drawer
        title="Client ma'lumotlari"
        width={860}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {!selectedClient ? null : (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ism">
                {selectedClient.name}
              </Descriptions.Item>
              <Descriptions.Item label="Telefon">
                {selectedClient.phone || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Manzil">
                {selectedClient.address || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Turi">
                {selectedClient.type === "supplier" ? (
                  <Tag color="blue">Supplier</Tag>
                ) : (
                  <Tag color="green">Customer</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Customer qarz (history)">
                <Text type={customerTotal > 0 ? "danger" : undefined}>
                  {formatMoney(customerTotal)}{" "}
                  {customerHistory?.[0]?.currency || ""}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Supplier qarz (history)">
                <Text type={supplierTotal > 0 ? "danger" : undefined}>
                  {formatMoney(supplierTotal)}{" "}
                  {supplierHistory?.[0]?.currency || ""}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Space style={{ marginTop: 12 }}>
              <Button
                type="primary"
                onClick={() => openPayModal("customer")}
                disabled={customerTotal <= 0}
              >
                Customer qarzidan to‘lov
              </Button>

              <Button
                onClick={() => openPayModal("supplier")}
                disabled={supplierTotal <= 0}
              >
                Supplier qarzidan to‘lov
              </Button>
            </Space>

            <Tabs
              style={{ marginTop: 16 }}
              items={[
                {
                  key: "customer",
                  label: `Customer qarz tarixi (${customerHistory.length})`,
                  children: (
                    <Table
                      rowKey="_id"
                      columns={debtColumns}
                      dataSource={customerHistory}
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />
                  ),
                },
                {
                  key: "supplier",
                  label: `Supplier qarz tarixi (${supplierHistory.length})`,
                  children: (
                    <Table
                      rowKey="_id"
                      columns={debtColumns}
                      dataSource={supplierHistory}
                      pagination={{ pageSize: 5 }}
                      size="small"
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* PAY DEBT MODAL */}
      <Modal
        title="Qarzdan to‘lov qilish"
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        onOk={() => payForm.submit()}
        confirmLoading={paying}
        destroyOnClose
      >
        <Form form={payForm} layout="vertical" onFinish={handlePaySubmit}>
          <Form.Item
            name="side"
            label="Qaysi qarz tomoni?"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="customer">Customer (bizga qarz)</Option>
              <Option value="supplier">Supplier (biz ularga qarz)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="To‘lov summasi"
            rules={[
              { required: true, message: "Summani kiriting" },
              { type: "number", min: 1, message: "Kamida 1 bo‘lishi kerak" },
            ]}
          >
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              placeholder="Masalan: 50000"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Yetkazibberuvchi;
