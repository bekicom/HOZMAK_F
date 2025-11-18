import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
  Select,
  Table,
  InputNumber,
  Card,
  Statistic,
  Space,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useGetAllProductsQuery } from "../../context/service/addproduct.service";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
} from "../../context/service/supplier.service";
import axios from "axios"; // ✅ QOSHISH KERAK

const { Option } = Select;

const AddProductToStore = ({ refetchProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [products, setProducts] = useState([
    {
      id: 1,
      product_name: "",
      model: "",
      quantity: 1,
      unit_price: 0,
      currency: "usd",
      count_type: "dona",
      barcode: "",
      brand_name: "",
      total_price: 0,
    },
  ]);

  const [createSupplier] = useCreateSupplierMutation();
  const { data: allProducts } = useGetAllProductsQuery();
  const { data: suppliers } = useGetSuppliersQuery();

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: "",
    company_name: "",
    phone: "",
    address: "",
  });

  const showModal = () => setIsModalOpen(true);

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setProducts([
      {
        id: 1,
        product_name: "",
        model: "",
        quantity: 1,
        unit_price: 0,
        currency: "usd",
        count_type: "dona",
        barcode: "",
        brand_name: "",
        total_price: 0,
      },
    ]);
    setSelectedSupplier(null);
    setPaidAmount(0);
    setIsNewSupplier(false);
    setNewSupplierData({
      name: "",
      company_name: "",
      phone: "",
      address: "",
    });
  };

  const addProductRow = () => {
    const newId = Date.now();
    setProducts([
      ...products,
      {
        id: newId,
        product_name: "",
        model: "",
        quantity: 1,
        unit_price: 0,
        currency: "usd",
        count_type: "dona",
        barcode: "",
        brand_name: "",
        total_price: 0,
      },
    ]);
  };

  const removeProductRow = (id) => {
    if (products.length > 1) {
      setProducts(products.filter((product) => product.id !== id));
    }
  };

  const updateProduct = (id, field, value) => {
    setProducts(
      products.map((product) => {
        if (product.id === id) {
          const updatedProduct = { ...product, [field]: value };

          if (field === "quantity" || field === "unit_price") {
            updatedProduct.total_price =
              updatedProduct.quantity * updatedProduct.unit_price;
          }

          return updatedProduct;
        }
        return product;
      })
    );
  };

  const generateBarcode = (productId) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    updateProduct(productId, "barcode", code);
  };

  const totals = products.reduce(
    (acc, product) => {
      acc.totalAmount += product.total_price || 0;
      acc.totalQuantity += product.quantity || 0;
      return acc;
    },
    { totalAmount: 0, totalQuantity: 0 }
  );

  const debtAmount = totals.totalAmount - paidAmount;

  const handleSupplierChange = (value) => {
    if (value === "new") {
      setIsNewSupplier(true);
      setSelectedSupplier(null);
    } else {
      setIsNewSupplier(false);
      setSelectedSupplier(value);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      if (
        !newSupplierData.name ||
        !newSupplierData.company_name ||
        !newSupplierData.phone ||
        !newSupplierData.address
      ) {
        message.error("Barcha maydonlarni to'ldiring");
        return;
      }

      const result = await createSupplier(newSupplierData).unwrap();
      message.success("Yetkazib beruvchi qo'shildi");
      setSelectedSupplier(result.supplier._id);
      setIsNewSupplier(false);
    } catch (error) {
      message.error(
        "Xatolik yuz berdi: " + (error.data?.message || "Noma'lum xato")
      );
    }
  };

  // ✅ ASOSIY TUZATISH - API'ga so'rov yuborish
  const handleFinish = async (values) => {
    try {
      if (!selectedSupplier) {
        message.error("Yetkazib beruvchi tanlang");
        return;
      }

      // Mahsulotlarni tekshirish
      const invalidProducts = products.filter(
        (p) =>
          !p.product_name || !p.model || p.quantity <= 0 || p.unit_price <= 0
      );

      if (invalidProducts.length > 0) {
        message.error(
          "Barcha mahsulotlarning nomi, modeli, miqdori va narxi to'ldirilishi kerak"
        );
        return;
      }

      // ✅ Backend'ga yuboradigan ma'lumotlar - total_price qo'shildi
      const receiptData = {
        supplier_id: selectedSupplier,
        products: products.map((product) => ({
          product_name: product.product_name,
          model: product.model,
          quantity: product.quantity,
          unit_price: product.unit_price,
          currency: product.currency,
          count_type: product.count_type,
          barcode: product.barcode || `temp_${product.id}`,
          brand_name: product.brand_name || "",
          total_price: product.quantity * product.unit_price, // ✅ QO'SHILDI
        })),
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        notes: values.notes || "",
        total_amount: totals.totalAmount,
        debt_amount: debtAmount,
      };

      console.log("✅ Yuborilayotgan ma'lumotlar:", receiptData);
      console.log("✅ URL:", "http://localhost:8080/api/product-receipts");

      // Loading message
      const hide = message.loading("Tavarlar qabul qilinmoqda...", 0);

      // ✅ API'ga POST so'rovi - TO'G'RI URL va PORT
      const response = await axios.post(
        "http://localhost:8080/api/product-receipts", // ✅ PORT 8080
        receiptData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ TOKEN
          },
          timeout: 10000,
        }
      );

      hide();
      console.log("✅ Server javobi:", response.data);
      message.success("Tavarlar muvaffaqiyatli qabul qilindi!");

      // ✅ Mahsulotlar ro'yxatini yangilash
      if (refetchProducts) {
        refetchProducts();
      }

      handleCancel();
    } catch (err) {
      console.error("❌ Xatolik:", err);
      console.error("❌ Response:", err.response);
      console.error("❌ Message:", err.message);

      if (err.code === "ERR_NETWORK") {
        message.error(
          "Server bilan bog'lanib bo'lmadi! Backend ishlab turganini tekshiring."
        );
      } else if (err.response) {
        message.error(
          "Xatolik: " + (err.response?.data?.message || "Noma'lum xato")
        );
      } else if (err.request) {
        message.error(
          "Server javob bermadi! Backend ishlab turganini tekshiring."
        );
      } else {
        message.error("Xatolik: " + err.message);
      }
    }
  };

  const productColumns = [
    {
      title: "Mahsulot nomi",
      dataIndex: "product_name",
      key: "product_name",
      width: 150,
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) =>
            updateProduct(record.id, "product_name", e.target.value)
          }
          placeholder="Mahsulot nomi"
        />
      ),
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 120,
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => updateProduct(record.id, "model", e.target.value)}
          placeholder="Model"
        />
      ),
    },
    {
      title: "Miqdor",
      dataIndex: "quantity",
      key: "quantity",
      width: 80,
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => updateProduct(record.id, "quantity", value)}
          min={1}
          style={{ width: "70px" }}
        />
      ),
    },
    {
      title: "Narx",
      dataIndex: "unit_price",
      key: "unit_price",
      width: 100,
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => updateProduct(record.id, "unit_price", value)}
          min={0}
          step={0.01}
          style={{ width: "90px" }}
        />
      ),
    },
    {
      title: "Valyuta",
      dataIndex: "currency",
      key: "currency",
      width: 80,
      render: (text, record) => (
        <Select
          value={text}
          onChange={(value) => updateProduct(record.id, "currency", value)}
          style={{ width: "80px" }}
        >
          <Option value="usd">USD</Option>
          <Option value="sum">So'm</Option>
        </Select>
      ),
    },
    {
      title: "Barcode",
      dataIndex: "barcode",
      key: "barcode",
      width: 140,
      render: (text, record) => (
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={text}
            onChange={(e) =>
              updateProduct(record.id, "barcode", e.target.value)
            }
            placeholder="Barcode"
          />
          <Button onClick={() => generateBarcode(record.id)} size="small">
            Yaratish
          </Button>
        </Space.Compact>
      ),
    },
    {
      title: "Jami",
      dataIndex: "total_price",
      key: "total_price",
      width: 100,
      render: (text) => <span>{text?.toLocaleString()}</span>,
    },
    {
      title: "Harakat",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeProductRow(record.id)}
          disabled={products.length === 1}
        />
      ),
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        onClick={showModal}
        style={{
          backgroundColor: "#1890ff",
          borderColor: "#1890ff",
          marginBottom: "10px",
        }}
        icon={<PlusOutlined />}
      >
        Tavar qabul qilish +
      </Button>

      <Modal
        title="Tavar qabul qilish"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={1100}
        style={{ top: 20 }}
      >
        <Form layout="vertical" form={form} onFinish={handleFinish}>
          <Card
            title="Yetkazib beruvchi"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Yetkazib beruvchi" required>
                  <Select
                    placeholder="Yetkazib beruvchi tanlang"
                    value={selectedSupplier}
                    onChange={handleSupplierChange}
                    showSearch
                    optionFilterProp="children"
                    disabled={isNewSupplier}
                  >
                    <Option value="new">+ Yangi yetkazib beruvchi</Option>
                    {suppliers?.map((supplier) => (
                      <Option key={supplier._id} value={supplier._id}>
                        {supplier.company_name} - {supplier.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {isNewSupplier && (
                  <div style={{ marginTop: 16 }}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Input
                          placeholder="Ism"
                          value={newSupplierData.name}
                          onChange={(e) =>
                            setNewSupplierData({
                              ...newSupplierData,
                              name: e.target.value,
                            })
                          }
                        />
                      </Col>
                      <Col span={12}>
                        <Input
                          placeholder="Firma nomi"
                          value={newSupplierData.company_name}
                          onChange={(e) =>
                            setNewSupplierData({
                              ...newSupplierData,
                              company_name: e.target.value,
                            })
                          }
                        />
                      </Col>
                    </Row>
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Input
                          placeholder="Telefon"
                          value={newSupplierData.phone}
                          onChange={(e) =>
                            setNewSupplierData({
                              ...newSupplierData,
                              phone: e.target.value,
                            })
                          }
                        />
                      </Col>
                      <Col span={12}>
                        <Input
                          placeholder="Manzil"
                          value={newSupplierData.address}
                          onChange={(e) =>
                            setNewSupplierData({
                              ...newSupplierData,
                              address: e.target.value,
                            })
                          }
                        />
                      </Col>
                    </Row>
                    <Button
                      type="primary"
                      onClick={handleCreateSupplier}
                      style={{ marginTop: 8 }}
                      block
                    >
                      Yetkazib beruvchini saqlash
                    </Button>
                  </div>
                )}
              </Col>
              <Col span={12}>
                <Form.Item label="To'lov usuli">
                  <Select value={paymentMethod} onChange={setPaymentMethod}>
                    <Option value="cash">Naqd</Option>
                    <Option value="card">Karta</Option>
                    <Option value="transfer">O'tkazma</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="To'langan summa">
                  <InputNumber
                    value={paidAmount}
                    onChange={setPaidAmount}
                    style={{ width: "100%" }}
                    min={0}
                    max={totals.totalAmount}
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            title={`Tavarlar (${products.length} ta)`}
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addProductRow}
              >
                Qo'shish
              </Button>
            }
          >
            <Table
              dataSource={products}
              columns={productColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>

          <Card title="Hisob-kitob" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Umumiy summa"
                  value={totals.totalAmount}
                  precision={2}
                  suffix={products[0]?.currency === "usd" ? " USD" : " So'm"}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="To'langan"
                  value={paidAmount}
                  precision={2}
                  suffix={products[0]?.currency === "usd" ? " USD" : " So'm"}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Qarz qoldig'i"
                  value={debtAmount}
                  precision={2}
                  valueStyle={{ color: debtAmount > 0 ? "#cf1322" : "#3f8600" }}
                  suffix={products[0]?.currency === "usd" ? " USD" : " So'm"}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Holat"
                  value={
                    debtAmount === 0
                      ? "To'langan"
                      : debtAmount === totals.totalAmount
                      ? "Qarz"
                      : "Qisman"
                  }
                  valueStyle={{
                    color:
                      debtAmount === 0
                        ? "#3f8600"
                        : debtAmount === totals.totalAmount
                        ? "#cf1322"
                        : "#faad14",
                  }}
                />
              </Col>
            </Row>
          </Card>

          <Form.Item label="Qo'shimcha izoh" name="notes">
            <Input.TextArea placeholder="Qo'shimcha izohlar..." rows={2} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Tavarlarni qabul qilish
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AddProductToStore;
