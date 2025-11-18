import React, { useState } from "react";
import {
  Table,
  Button,
  Input,
  message,
  Modal,
  Form,
  Space,
  Select,
  Popover,
  Tag,
} from "antd";
import {
  useGetDebtorsQuery,
  useUpdateDebtorMutation,
  useReturnProductDebtorMutation,
  useCreatePaymentMutation,
} from "../../context/service/debtor.service";
import moment from "moment";
import { useGetUsdRateQuery } from "../../context/service/usd.service";
import { FaDollarSign } from "react-icons/fa";

export default function Qarzdor() {
  const { data: debtors = [], refetch } = useGetDebtorsQuery();
  const [updateDebtor] = useUpdateDebtorMutation();
  const [returnProduct] = useReturnProductDebtorMutation();
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [returnQuantities, setReturnQuantities] = useState({});
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createPayment] = useCreatePaymentMutation();
  const [paymentDebtor, setPaymentDebtor] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { data: usdRateData } = useGetUsdRateQuery();

  const usdRate = Number(usdRateData?.rate || 12850);

  // Convert price to sum for display
  const convertToSum = (price, currency) => {
    const numPrice = Number(price || 0);
    if (currency === "usd") {
      return numPrice * usdRate;
    }
    return numPrice;
  };

  // Format number with currency
  const formatNumber = (num, curr) => {
    const formatted = Number(num || 0).toLocaleString("uz-UZ");
    return curr === "usd" ? `${formatted} $` : `${formatted} so'm`;
  };

  const handlePay = async (debtorId, productId) => {
    const key = `${debtorId}_${productId}`;
    const amount = Number(paymentAmounts[key]);

    if (!amount || amount <= 0) {
      message.error("To'g'ri summa kiriting");
      return;
    }

    try {
      await updateDebtor({
        id: debtorId,
        paid_amount: amount,
        product_id: productId,
      }).unwrap();
      message.success("To'lov saqlandi");
      setPaymentAmounts((prev) => ({ ...prev, [key]: "" }));
      refetch();
    } catch (err) {
      message.error("Xatolik: " + (err?.data?.message || "Noma'lum xatolik"));
    }
  };

  const handleReturn = async (debtorId, productId, index, product) => {
    const key = `${debtorId}_${productId}_${index}`;
    const quantityStr = returnQuantities[key];

    if (
      !quantityStr ||
      isNaN(Number(quantityStr)) ||
      Number(quantityStr) <= 0
    ) {
      message.error("Qaytariladigan miqdor noto'g'ri");
      return;
    }

    const quantity = Number(quantityStr);

    try {
      // Send the product's original currency to maintain consistency
      const productCurrency =
        product.currency || selectedDebtor.currency || "sum";

      await returnProduct({
        id: debtorId,
        product_id: productId,
        quantity: quantity,
        currency: productCurrency, // Send the correct currency
      }).unwrap();

      message.success("Mahsulot qaytarildi");
      setReturnQuantities((prev) => ({ ...prev, [key]: "" }));
      setModalOpen(false);
      setSelectedDebtor(null);
      refetch();
    } catch (err) {
      message.error("Xatolik: " + (err?.data?.message || "Noma'lum xatolik"));
    }
  };

  const columns = [
    {
      title: "Ism",
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
      width: 150,
    },
    {
      title: "Mahsulotlar",
      width: 120,
      render: (_, record) => (
        <Tag color="blue">{record.products?.length || 0} ta mahsulot</Tag>
      ),
    },
    {
      title: "Jami qarz (so'm)",
      width: 150,
      render: (_, record) => {
        const amount = Number(record.debt_amount || 0);
        const currency = record.currency || "sum";

        // Convert to sum if currency is USD
        const totalInSum = currency === "usd" ? amount * usdRate : amount;

        return (
          <strong style={{ color: totalInSum > 0 ? "red" : "green" }}>
            {totalInSum.toLocaleString("uz-UZ")} so'm
          </strong>
        );
      },
    },
    {
      title: "Jami qarz (USD)",
      width: 150,
      render: (_, record) => {
        const amount = Number(record.debt_amount || 0);
        const currency = record.currency || "sum";

        // Convert to USD if currency is sum
        const totalInUsd = currency === "sum" ? amount / usdRate : amount;

        return (
          <strong style={{ color: totalInUsd > 0 ? "red" : "green" }}>
            {totalInUsd.toLocaleString("uz-UZ", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            $
          </strong>
        );
      },
    },
    {
      title: "Valyuta",
      width: 100,
      render: (_, record) => (
        <Tag color={record.currency === "usd" ? "green" : "blue"}>
          {record.currency === "usd" ? "USD" : "SO'M"}
        </Tag>
      ),
    },
    {
      title: "Amallar",
      width: 300,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            onClick={() => {
              setSelectedDebtor(record);
              setModalOpen(true);
            }}
          >
            📋 Batafsil
          </Button>

          <Button
            type="primary"
            onClick={() => {
              setPaymentDebtor(record);
              setPaymentModalOpen(true);
            }}
            icon={<FaDollarSign />}
          >
            To'lash
          </Button>

          <Popover
            trigger="click"
            title="To'lovlar tarixi"
            content={
              <Table
                size="small"
                dataSource={record.payment_log || []}
                columns={[
                  {
                    title: "Summa",
                    dataIndex: "amount",
                    key: "amount",
                    render: (text, log) => {
                      const amount = Number(text || 0);
                      const currency = log.currency || "sum";
                      return `${amount.toLocaleString("uz-UZ")} ${
                        currency === "usd" ? "$" : "so'm"
                      }`;
                    },
                  },
                  {
                    title: "Sana",
                    dataIndex: "date",
                    render: (text) => moment(text).format("DD.MM.YYYY HH:mm"),
                  },
                ]}
                pagination={false}
              />
            }
          >
            <Button type="dashed">💰 To'lovlar</Button>
          </Popover>
        </Space>
      ),
    },
    {
      title: "Sana",
      dataIndex: "createdAt",
      width: 150,
      render: (text) => moment(text).format("DD.MM.YYYY HH:mm"),
    },
  ];

  return (
    <>
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={debtors.filter((d) => Number(d.debt_amount || 0) > 0)}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1400 }}
      />

      {/* Payment Modal */}
      <Modal
        open={paymentModalOpen}
        title={`💰 To'lov - ${paymentDebtor?.name}`}
        onCancel={() => {
          setPaymentModalOpen(false);
          setPaymentDebtor(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <div
          style={{
            marginBottom: 20,
            padding: 15,
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>
            Jami qarz:
            <strong style={{ color: "red", marginLeft: 10 }}>
              {paymentDebtor?.currency === "usd"
                ? `${Number(paymentDebtor?.debt_amount || 0).toLocaleString(
                    "uz-UZ"
                  )} $ 
                   (${(
                     Number(paymentDebtor?.debt_amount || 0) * usdRate
                   ).toLocaleString("uz-UZ")} so'm)`
                : `${Number(paymentDebtor?.debt_amount || 0).toLocaleString(
                    "uz-UZ"
                  )} so'm 
                   (${(
                     Number(paymentDebtor?.debt_amount || 0) / usdRate
                   ).toLocaleString("uz-UZ", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                   })} $)`}
            </strong>
          </h3>
        </div>

        <Form
          onFinish={async (values) => {
            try {
              const paymentData = {
                id: paymentDebtor._id,
                amount: Number(values.amount),
                currency: values.currency,
                rate: usdRate,
                payment_method: values.payment_method, // Use selected payment method
              };

              await createPayment(paymentData).unwrap();

              message.success("To'lov amalga oshirildi");
              setPaymentModalOpen(false);
              setPaymentDebtor(null);
              form.resetFields();
              refetch();
            } catch (err) {
              console.error("Payment error:", err);
              message.error(
                "Xatolik: " + (err?.data?.message || "Noma'lum xatolik")
              );
            }
          }}
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="To'lov summasi"
            name="amount"
            rules={[
              { required: true, message: "Summani kiriting" },
              {
                validator: (_, value) => {
                  if (value && Number(value) <= 0) {
                    return Promise.reject("Summa 0 dan katta bo'lishi kerak");
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              type="number"
              min={0.01}
              step={0.01}
              placeholder="Summa kiriting"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Valyuta"
            name="currency"
            rules={[{ required: true, message: "Valyutani tanlang" }]}
            initialValue={paymentDebtor?.currency || "sum"}
          >
            <Select size="large">
              <Select.Option value="usd">💵 USD</Select.Option>
              <Select.Option value="sum">💰 So'm</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="To'lov usuli"
            name="payment_method"
            rules={[{ required: true, message: "To'lov usulini tanlang" }]}
            initialValue="naqd"
          >
            <Select size="large">
              <Select.Option value="naqd">💵 Naqd pul</Select.Option>
              <Select.Option value="plastik">💳 Plastik karta</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              💳 To'lash
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Products Detail Modal */}
      <Modal
        open={modalOpen}
        title={`📦 ${selectedDebtor?.name} - mahsulotlar ro'yxati`}
        onCancel={() => {
          setModalOpen(false);
          setSelectedDebtor(null);
        }}
        footer={null}
        width={900}
      >
        {selectedDebtor?.products?.map((product, index) => {
          const productId = product.product_id?._id || product.product_id;
          const key = `${selectedDebtor._id}_${productId}_${index}`;

          const quantity = Number(product.quantity || 1);
          const originalPrice = Number(product.sell_price || 0);
          const productCurrency =
            product.currency || selectedDebtor.currency || "sum";

          // Calculate price in both currencies
          const priceInSum =
            productCurrency === "usd" ? originalPrice * usdRate : originalPrice;

          const priceInUsd =
            productCurrency === "sum" ? originalPrice / usdRate : originalPrice;

          const totalInSum = priceInSum * quantity;
          const totalInUsd = priceInUsd * quantity;

          return (
            <div
              key={key}
              style={{
                marginBottom: "20px",
                borderBottom: "1px solid #e8e8e8",
                paddingBottom: 15,
                background: "#fafafa",
                padding: 15,
                borderRadius: 8,
              }}
            >
              <h3 style={{ marginTop: 0, color: "#1890ff" }}>
                📦 {product.product_name}
              </h3>

              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <div>
                  <strong>Soni:</strong> {quantity}
                </div>

                <div>
                  <strong>Narxi (so'm):</strong>{" "}
                  {priceInSum.toLocaleString("uz-UZ")} so'm
                </div>

                <div>
                  <strong>Narxi (USD):</strong>{" "}
                  {priceInUsd.toLocaleString("uz-UZ", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  $
                </div>

                <div>
                  <strong>Jami qarz (so'm):</strong>{" "}
                  <span style={{ color: "red", fontWeight: "bold" }}>
                    {totalInSum.toLocaleString("uz-UZ")} so'm
                  </span>
                </div>

                <div>
                  <strong>Jami qarz (USD):</strong>{" "}
                  <span style={{ color: "red", fontWeight: "bold" }}>
                    {totalInUsd.toLocaleString("uz-UZ", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    $
                  </span>
                </div>

                <div>
                  <strong>Valyuta:</strong>{" "}
                  <Tag color={productCurrency === "usd" ? "green" : "blue"}>
                    {productCurrency === "usd" ? "USD" : "SO'M"}
                  </Tag>
                </div>

                <div>
                  <strong>Sotish vaqti:</strong>{" "}
                  {moment(product.sold_date || selectedDebtor.sold_date).format(
                    "DD.MM.YYYY HH:mm"
                  )}
                </div>

                <div>
                  <strong>Qarz muddati:</strong>{" "}
                  <span style={{ color: "orange" }}>
                    {moment(product.due_date || selectedDebtor.due_date).format(
                      "DD.MM.YYYY"
                    )}
                  </span>
                </div>
              </Space>

              <div style={{ marginTop: 15 }}>
                <Space>
                  <Input
                    placeholder="Qaytariladigan soni"
                    value={returnQuantities[key] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReturnQuantities((prev) => ({
                        ...prev,
                        [key]: val === "" ? "" : Number(val),
                      }));
                    }}
                    style={{ width: 180 }}
                    type="number"
                    min={0.1}
                    step={0.1}
                    max={quantity}
                  />
                  <Button
                    danger
                    onClick={() =>
                      handleReturn(
                        selectedDebtor._id,
                        productId,
                        index,
                        product
                      )
                    }
                    disabled={
                      !returnQuantities[key] || returnQuantities[key] <= 0
                    }
                  >
                    ↩️ Qaytarish
                  </Button>
                </Space>
                {returnQuantities[key] && returnQuantities[key] > quantity && (
                  <div style={{ color: "red", marginTop: 5, fontSize: 12 }}>
                    ⚠️ Qaytariladigan miqdor mavjud miqdordan ko'p bo'lishi
                    mumkin emas!
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(!selectedDebtor?.products ||
          selectedDebtor.products.length === 0) && (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            Mahsulotlar topilmadi
          </div>
        )}
      </Modal>
    </>
  );
}
