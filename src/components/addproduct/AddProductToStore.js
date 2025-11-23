import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
  Select,
  AutoComplete,
  Divider,
  InputNumber,
  Alert,
  Card,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useCreateProductToStoreMutation } from "../../context/service/store.service";
import { useGetAllProductsQuery } from "../../context/service/addproduct.service";
import { useGetClientsQuery } from "../../context/service/client.service";

const { Option } = Select;

// Separate component for debt alert to avoid conditional hook calls
const DebtAlert = ({ form }) => {
  const supplierDebt = Form.useWatch("supplier_debt", form);
  const purchaseCurrency = Form.useWatch("purchase_currency", form);

  if (!supplierDebt || supplierDebt <= 0) return null;

  return (
    <Alert
      message="Diqqat!"
      description={`Siz supplier'ga ${supplierDebt} ${purchaseCurrency?.toUpperCase()} qarz qoldirasiz. Bu qarz avtomatik ravishda supplier hisobiga qo'shiladi.`}
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
};

const AddProductToStore = ({ refetchProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [barcode, setBarcode] = useState("");

  const [createProduct, { isLoading: isCreating }] =
    useCreateProductToStoreMutation();

  const { data: allProductsResponse } = useGetAllProductsQuery();
  const { data: clientsResponse, isLoading: clientsLoading } =
    useGetClientsQuery();

  // Parse products response
  const allProducts = useMemo(() => {
    if (!allProductsResponse) return [];
    if (Array.isArray(allProductsResponse)) return allProductsResponse;
    if (allProductsResponse.products) return allProductsResponse.products;
    if (allProductsResponse.data) return allProductsResponse.data;
    return [];
  }, [allProductsResponse]);

  // Parse clients response - faqat supplier'lar
  const suppliers = useMemo(() => {
    if (!clientsResponse) return [];

    let list = [];
    if (Array.isArray(clientsResponse)) {
      list = clientsResponse;
    } else if (clientsResponse.clients) {
      list = clientsResponse.clients;
    } else if (clientsResponse.data) {
      list = clientsResponse.data;
    }

    // Faqat supplier type bo'lganlarni qaytarish
    return list.filter((c) => c.type === "supplier");
  }, [clientsResponse]);

  // Barcode generator
  const generateBarcode = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  // Modal ochilganda default values
  useEffect(() => {
    if (isModalOpen) {
      const code = generateBarcode();
      setBarcode(code);

      form.setFieldsValue({
        barcode: code,
        purchase_currency: "usd",
        sell_currency: "usd",
        count_type: "dona",
        stock: 1,
        purchase_price: 0,
        sell_price: 0,
        paid_amount: 0,
        total_purchase_price: 0,
        supplier_debt: 0,
      });
    }
  }, [isModalOpen, generateBarcode, form]);

  // Existing products for autocomplete
  const { productNames, models, brandNames, countTypes } = useMemo(() => {
    if (!allProducts?.length) {
      return { productNames: [], models: [], brandNames: [], countTypes: [] };
    }

    return {
      productNames: [
        ...new Set(allProducts.map((p) => p.product_name).filter(Boolean)),
      ],
      models: [...new Set(allProducts.map((p) => p.model).filter(Boolean))],
      brandNames: [
        ...new Set(allProducts.map((p) => p.brand_name).filter(Boolean)),
      ],
      countTypes: [
        ...new Set(allProducts.map((p) => p.count_type).filter(Boolean)),
      ],
    };
  }, [allProducts]);

  // Supplier options
  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      value: s.name,
      label: (
        <div>
          <strong>{s.name}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {s.phone} {s.address ? " • " + s.address : ""}
          </div>
        </div>
      ),
      key: s._id,
      phone: s.phone,
      address: s.address,
    }));
  }, [suppliers]);

  // Supplier tanlanganda phone/address autopaste
  const handleSupplierSelect = useCallback(
    (value) => {
      const found = suppliers.find((s) => s.name === value);
      if (found) {
        form.setFieldsValue({
          supplier_phone: found.phone || "",
          supplier_address: found.address || "",
        });
      }
    },
    [suppliers, form]
  );

  /**
   * Supplier debt calculation:
   * total_purchase = stock * purchase_price
   * supplier_debt = total_purchase - paid_amount
   */
  const computeTotals = useCallback(() => {
    const stock = Number(form.getFieldValue("stock") || 0);
    const purchasePrice = Number(form.getFieldValue("purchase_price") || 0);
    const paid = Number(form.getFieldValue("paid_amount") || 0);

    const totalPurchase = stock * purchasePrice;
    const debt = Math.max(0, totalPurchase - paid);

    form.setFieldsValue({
      total_purchase_price: totalPurchase.toFixed(2),
      supplier_debt: debt.toFixed(2),
    });
  }, [form]);

  // Auto-calculate on field changes
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(computeTotals, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, computeTotals]);

  const handleBarcodeRegenerate = useCallback(() => {
    const code = generateBarcode();
    setBarcode(code);
    form.setFieldsValue({ barcode: code });
  }, [generateBarcode, form]);

  // SUBMIT
  const handleSubmit = useCallback(
    async (values) => {
      try {
        const supplierName = values.supplier_name?.trim();
        const supplierPhone = values.supplier_phone?.trim();
        const supplierAddress = values.supplier_address?.trim();

        // Agar supplier ma'lumotlari kiritilgan bo'lsa
        const supplierObj =
          supplierName || supplierPhone || supplierAddress
            ? {
                name: supplierName || "Noma'lum supplier",
                phone: supplierPhone || "",
                address: supplierAddress || "",
                type: "supplier", // IMPORTANT: type qo'shildi
              }
            : null;

        const totalPurchase =
          Number(values.stock) * Number(values.purchase_price);
        const paidAmount = Number(values.paid_amount || 0);
        const debt = Math.max(0, totalPurchase - paidAmount);

        const payload = {
          barcode: values.barcode,
          product_name: values.product_name,
          model: values.model,
          stock: Math.max(1, Number(values.stock || 1)),
          purchase_price: Number(values.purchase_price || 0),
          sell_price: Number(values.sell_price || 0),
          purchase_currency: values.purchase_currency,
          sell_currency: values.sell_currency,
          brand_name: values.brand_name || "",
          count_type: values.count_type,
          paid_amount: paidAmount,
          supplier_debt: debt, // Qarz qo'shildi
          special_notes: values.special_notes || "",
          kimdan_kelgan: values.kimdan_kelgan || supplierName || "",
          client: supplierObj, // Backend supplier sifatida ishlaydi
        };

        await createProduct(payload).unwrap();

        if (debt > 0) {
          message.success(
            `Mahsulot qo'shildi! Supplier qarzi: ${debt.toFixed(
              2
            )} ${values.purchase_currency.toUpperCase()}`
          );
        } else {
          message.success("Mahsulot muvaffaqiyatli qo'shildi!");
        }

        setIsModalOpen(false);
        form.resetFields();
        setBarcode("");
        refetchProducts && refetchProducts();
      } catch (err) {
        console.error(err);
        message.error(err?.data?.message || "Xatolik yuz berdi!");
      }
    },
    [createProduct, form, refetchProducts]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
    setBarcode("");
  }, [form]);

  return (
    <div>
      <Button
        type="primary"
        onClick={() => setIsModalOpen(true)}
        icon={<PlusOutlined />}
        size="large"
        style={{
          backgroundColor: "#52c41a",
          borderColor: "#52c41a",
          marginBottom: 12,
        }}
      >
        Dokonga mahsulot qo'shish
      </Button>

      <Modal
        title="Yangi mahsulot qo'shish"
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={900}
        destroyOnClose
      >
        {/* BARCODE */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form layout="inline">
            <Form.Item label="Shtrix kod">
              <Input
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  form.setFieldsValue({ barcode: e.target.value });
                }}
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item>
              <Button onClick={handleBarcodeRegenerate}>
                Yangi barcode yaratish
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="barcode" initialValue={barcode} hidden>
            <Input />
          </Form.Item>

          {/* MAHSULOT MA'LUMOTLARI */}
          <Divider orientation="left">Mahsulot ma'lumotlari</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="product_name"
                label="Mahsulot nomi"
                rules={[{ required: true, message: "Mahsulot nomi majburiy!" }]}
              >
                <AutoComplete
                  options={productNames.map((v) => ({ value: v }))}
                  placeholder="Mahsulot nomini kiriting"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="model"
                label="Model"
                rules={[{ required: true, message: "Model majburiy!" }]}
              >
                <AutoComplete
                  options={models.map((v) => ({ value: v }))}
                  placeholder="Model kiriting"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="count_type"
                label="O'lchov birligi"
                rules={[{ required: true, message: "O'lchov majburiy!" }]}
              >
                <AutoComplete
                  options={[
                    ...countTypes.map((v) => ({ value: v })),
                    { value: "dona" },
                    { value: "kg" },
                    { value: "litr" },
                    { value: "metr" },
                    { value: "qadoq" },
                    { value: "blok" },
                  ]}
                  placeholder="dona, kg, litr..."
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="stock"
                label="Miqdor"
                rules={[
                  { required: true, message: "Miqdor majburiy!" },
                  { type: "number", min: 1, message: "Kamida 1" },
                ]}
                initialValue={1}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                  placeholder="Miqdor"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="brand_name" label="Brand">
                <AutoComplete
                  options={brandNames.map((v) => ({ value: v }))}
                  placeholder="Brand nomi"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* NARXLAR */}
          <Divider orientation="left">Narxlar</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="purchase_price"
                label="Tannarx (1 dona)"
                rules={[{ required: true, message: "Tannarx majburiy!" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                  placeholder="0"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="purchase_currency"
                label="Valyuta"
                initialValue="usd"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="usd">USD</Option>
                  <Option value="sum">SUM</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="total_purchase_price" label="Umumiy tannarx">
                <Input disabled style={{ fontWeight: "bold" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sell_price"
                label="Sotish narxi (1 dona)"
                rules={[{ required: true, message: "Sotish narxi majburiy!" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="sell_currency"
                label="Sotish valyutasi"
                initialValue="usd"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="usd">USD</Option>
                  <Option value="sum">SUM</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* TO'LOV VA QARZ */}
          <Divider orientation="left">To'lov ma'lumotlari</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paid_amount"
                label="To'langan summa"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                  placeholder="0"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="supplier_debt" label="Supplier qarzi">
                <Input
                  disabled
                  style={{
                    fontWeight: "bold",
                    color: "#ff4d4f",
                    fontSize: 16,
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <DebtAlert form={form} />

          {/* SUPPLIER MA'LUMOTLARI */}
          <Divider orientation="left">Yetkazib beruvchi (Supplier)</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier_name"
                label="Supplier nomi"
                rules={[
                  { required: true, message: "Supplier nomini kiriting!" },
                ]}
              >
                <AutoComplete
                  options={supplierOptions}
                  onSelect={handleSupplierSelect}
                  loading={clientsLoading}
                  placeholder="Supplier tanlang yoki yangi kiriting"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="supplier_phone" label="Telefon">
                <Input placeholder="+998 XX XXX XX XX" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="supplier_address" label="Manzil">
                <Input placeholder="Supplier manzili" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="kimdan_kelgan"
                label="Kimdan kelgan (qo'shimcha)"
              >
                <Input placeholder="Qo'shimcha ma'lumot" />
              </Form.Item>
            </Col>
          </Row>

          {/* QO'SHIMCHA */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="special_notes" label="Izoh">
                <Input.TextArea rows={2} placeholder="Qo'shimcha izoh..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isCreating}
              size="large"
              style={{ height: 50, fontSize: 16 }}
            >
              Saqlash
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AddProductToStore;
