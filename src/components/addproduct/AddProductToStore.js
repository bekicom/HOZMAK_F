// --- CODE START ---
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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useCreateProductToStoreMutation } from "../../context/service/store.service";
import { useGetAllProductsQuery } from "../../context/service/addproduct.service";
import { useGetClientsQuery } from "../../context/service/client.service";

const { Option } = Select;

const AddProductToStore = ({ refetchProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [barcode, setBarcode] = useState("");

  const [createProduct, { isLoading: isCreating }] =
    useCreateProductToStoreMutation();

  const { data: allProducts } = useGetAllProductsQuery();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery();

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

        total_purchase_price_preview: 0,
        supplier_debt_preview: 0,
      });
    }
  }, [isModalOpen, generateBarcode, form]);

  // Clients list normalize
  const clientList = useMemo(() => {
    if (!clientsData) return [];
    if (Array.isArray(clientsData)) return clientsData;
    return clientsData.clients || clientsData.data || [];
  }, [clientsData]);

  // Existing products for autocomplete
  const { productNames, models, brandNames, countTypes } = useMemo(() => {
    if (!allProducts)
      return { productNames: [], models: [], brandNames: [], countTypes: [] };

    const list = Array.isArray(allProducts)
      ? allProducts
      : allProducts.products || [];

    return {
      productNames: [
        ...new Set(list.map((p) => p.product_name).filter(Boolean)),
      ],
      models: [...new Set(list.map((p) => p.model).filter(Boolean))],
      brandNames: [...new Set(list.map((p) => p.brand_name).filter(Boolean))],
      countTypes: [...new Set(list.map((p) => p.count_type).filter(Boolean))],
    };
  }, [allProducts]);

  // Supplier options
  const clientOptions = useMemo(() => {
    return clientList.map((c) => ({
      value: c.name,
      label: (
        <div>
          <strong>{c.name}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {c.phone} {c.address ? " • " + c.address : ""}
          </div>
        </div>
      ),
      key: c._id,
      phone: c.phone,
      address: c.address,
    }));
  }, [clientList]);

  // Supplier tanlanganda phone/address autopaste
  const handleClientSelect = useCallback(
    (value) => {
      const found = clientList.find((c) => c.name === value);
      if (found) {
        form.setFieldsValue({
          client_phone: found.phone || "",
          client_address: found.address || "",
        });
      }
    },
    [clientList, form]
  );

  /**
   * Supplier debt preview:
   * total_purchase = stock * purchase_price
   * remaining_debt = total_purchase - paid_amount
   */
  const computeTotals = useCallback(() => {
    const stock = Number(form.getFieldValue("stock") || 0);
    const purchasePrice = Number(form.getFieldValue("purchase_price") || 0);
    const paid = Number(form.getFieldValue("paid_amount") || 0);

    const totalPurchase = stock * purchasePrice;
    const debt = totalPurchase - paid;

    form.setFieldsValue({
      total_purchase_price_preview: totalPurchase,
      supplier_debt_preview: debt > 0 ? debt : 0,
    });
  }, [form]);

  useEffect(() => {
    if (isModalOpen) computeTotals();
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
        const trimmedName = values.client_name?.trim();

        // Supplier object (type yo‘q!)
        const supplierObj =
          trimmedName || values.client_phone || values.client_address
            ? {
                name: trimmedName || "Noma'lum",
                phone: values.client_phone?.trim() || "",
                address: values.client_address?.trim() || "",
              }
            : null;

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

          paid_amount: Number(values.paid_amount || 0),

          special_notes: values.special_notes || "",
          kimdan_kelgan: values.kimdan_kelgan || "",

          client: supplierObj, // backendda supplier sifatida ishlaydi
        };

        await createProduct(payload).unwrap();

        message.success("Mahsulot qo'shildi!");
        setIsModalOpen(false);
        form.resetFields();
        setBarcode("");
        refetchProducts && refetchProducts();
      } catch (err) {
        console.log(err);
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
        style={{
          backgroundColor: "#52c41a",
          borderColor: "#52c41a",
          marginBottom: 12,
        }}
      >
        Dokonga mahsulot qo'shish +
      </Button>

      <Modal
        title="Mahsulot yaratish"
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={820}
        destroyOnClose
      >
        {/* BARCODE */}
        <Form layout="inline" style={{ marginBottom: 15 }}>
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
            <Button onClick={handleBarcodeRegenerate}>Yangi barcode</Button>
          </Form.Item>
        </Form>

        <Divider />

        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="barcode" initialValue={barcode} hidden>
            <Input />
          </Form.Item>

          {/* PRODUCT INFO */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="product_name"
                label="Mahsulot nomi"
                rules={[{ required: true, message: "Mahsulot nomi majburiy" }]}
              >
                <AutoComplete
                  options={productNames.map((v) => ({ value: v }))}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="model"
                label="Model"
                rules={[{ required: true, message: "Model majburiy" }]}
              >
                <AutoComplete options={models.map((v) => ({ value: v }))} />
              </Form.Item>
            </Col>
          </Row>

          {/* COUNT TYPE + STOCK */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="count_type"
                label="O'lchov birligi"
                rules={[
                  { required: true, message: "O'lchov birligi majburiy" },
                ]}
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
                  placeholder="dona / kg / litr / ..."
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="stock"
                label="Miqdor"
                rules={[
                  { required: true, message: "Miqdor majburiy" },
                  {
                    type: "number",
                    min: 1,
                    message: "Miqdor kamida 1 bo‘lsin",
                  },
                ]}
                initialValue={1}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* PRICES */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="purchase_price"
                label="Tannarx (1 dona)"
                rules={[{ required: true, message: "Tannarx majburiy" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="total_purchase_price_preview"
                label="Umumiy tannarx (preview)"
              >
                <Input disabled />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="purchase_currency"
                label="Olish valyutasi"
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

          <Divider />
          <h3>To‘lov ma'lumotlari (Supplier)</h3>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="paid_amount"
                label="To‘langan summa"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  onChange={computeTotals}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="supplier_debt_preview"
                label="Qolgan qarz (preview)"
              >
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sell_price"
                label="Sotish narxi (1 dona)"
                rules={[{ required: true, message: "Sotish narxi majburiy" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand_name" label="Brand">
                <AutoComplete options={brandNames.map((v) => ({ value: v }))} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="special_notes" label="Izoh">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <h3>Kimdan kelgan (Supplier)</h3>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="client_name" label="Ism">
                <AutoComplete
                  options={clientOptions}
                  onSelect={handleClientSelect}
                  loading={clientsLoading}
                  placeholder="Supplier tanlang yoki yozing"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="client_phone" label="Telefon">
                <Input />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="client_address" label="Manzil">
                <Input />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="kimdan_kelgan" label="Kimdan kelgan (matn)">
                <Input placeholder="Ixtiyoriy" />
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
// --- CODE END ---
