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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useCreateProductToStoreMutation } from "../../context/service/store.service";
import { useGetAllProductsQuery } from "../../context/service/addproduct.service";
import {
  useGetClientsQuery,
  useCreateClientMutation,
} from "../../context/service/client.service";

const { Option } = Select;

const AddProductToStore = ({ refetchProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [barcode, setBarcode] = useState("");

  const [createProduct, { isLoading: isCreating }] =
    useCreateProductToStoreMutation();

  const { data: allProducts } = useGetAllProductsQuery();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery();
  const [createClient] = useCreateClientMutation();

  // Generate barcode
  const generateBarcode = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  // On modal open -> generate barcode
  useEffect(() => {
    if (isModalOpen) {
      const code = generateBarcode();
      setBarcode(code);

      form.setFieldsValue({
        barcode: code,
        total_purchase_price: 0,
        payment_amount: 0,
        debt_amount: 0,
      });
    }
  }, [isModalOpen, generateBarcode, form]);

  // Normalize clients
  const clientList = useMemo(() => {
    if (!clientsData) return [];
    if (Array.isArray(clientsData)) return clientsData;
    return clientsData.clients || clientsData.data || [];
  }, [clientsData]);

  // Unique product attrs
  const { productNames, models, brandNames } = useMemo(() => {
    if (!allProducts) return { productNames: [], models: [], brandNames: [] };
    const list = Array.isArray(allProducts)
      ? allProducts
      : allProducts.products || [];

    return {
      productNames: [
        ...new Set(list.map((p) => p.product_name).filter(Boolean)),
      ],
      models: [...new Set(list.map((p) => p.model).filter(Boolean))],
      brandNames: [...new Set(list.map((p) => p.brand_name).filter(Boolean))],
    };
  }, [allProducts]);

  // Client options
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

  // When selecting client
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

  // Compute total + debt
  const computeTotals = useCallback(() => {
    const stock = Number(form.getFieldValue("stock") || 0);
    const purchasePrice = Number(form.getFieldValue("purchase_price") || 0);
    const total = stock * purchasePrice;

    const paid = Number(form.getFieldValue("payment_amount") || 0);
    const debt = total - paid;

    form.setFieldsValue({
      total_purchase_price: total,
      debt_amount: debt < 0 ? 0 : debt,
    });
  }, [form]);

  // Compute when modal opens
  useEffect(() => {
    if (isModalOpen) computeTotals();
  }, [isModalOpen, computeTotals]);

  // Regenerate barcode
  const handleBarcodeRegenerate = useCallback(() => {
    const code = generateBarcode();
    setBarcode(code);
    form.setFieldsValue({ barcode: code });
  }, [generateBarcode, form]);

  // Submit
  const handleSubmit = useCallback(
    async (values) => {
      try {
        let client_id = null;

        const trimmedName = values.client_name?.trim() || "";

        let existing = clientList.find(
          (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );

        if (existing) {
          client_id = existing._id;
        } else {
          // Create new client
          const res = await createClient({
            name: trimmedName,
            phone: values.client_phone?.trim(),
            address: values.client_address?.trim(),
          }).unwrap();

          client_id = res.client?._id || res._id;
        }

        // Build payload
        const payload = {
          barcode: values.barcode,
          product_name: values.product_name,
          model: values.model,
          stock: Number(values.stock),
          purchase_price: Number(values.purchase_price),
          sell_price: Number(values.sell_price),
          purchase_currency: values.currency,
          sell_currency: values.currency,
          total_purchase_price: Number(values.total_purchase_price),
          payment_amount: Number(values.payment_amount),
          debt_amount: Number(values.debt_amount),
          brand_name: values.brand_name,
          client_id,
        };

        await createProduct(payload).unwrap();

        message.success("Mahsulot muvaffaqiyatli qo'shildi!");

        setIsModalOpen(false);
        form.resetFields();
        setBarcode("");

        refetchProducts && refetchProducts();
      } catch (err) {
        console.log(err);
        message.error(err?.data?.message || "Xatolik yuz berdi!");
      }
    },
    [clientList, createClient, createProduct, form, refetchProducts]
  );

  // Close modal
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
        Dokonga Mahsulot qo'shish +
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
                rules={[{ required: true }]}
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
                rules={[{ required: true }]}
              >
                <AutoComplete options={models.map((v) => ({ value: v }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="Miqdor"
                rules={[{ required: true }]}
              >
                <Input type="number" onChange={computeTotals} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="purchase_price"
                label="Tannarx (1 dona)"
                rules={[{ required: true }]}
              >
                <Input type="number" onChange={computeTotals} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="total_purchase_price" label="Umumiy tannarx">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* PAYMENT BLOCK */}
          <Divider />

          <h3>To'lov ma'lumotlari</h3>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="payment_amount"
                label="To'langan summa"
                initialValue={0}
              >
                <Input type="number" onChange={computeTotals} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="debt_amount" label="Qolgan qarz">
                <Input disabled />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="currency" label="Valyuta" initialValue="usd">
                <Select>
                  <Option value="usd">USD ($)</Option>
                  <Option value="sum">SUM</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* SELL PRICE */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sell_price"
                label="Sotish narxi"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="brand_name" label="Brand">
                <AutoComplete options={brandNames.map((v) => ({ value: v }))} />
              </Form.Item>
            </Col>
          </Row>

          {/* CLIENT */}
          <Divider />

          <h3>Kimdan kelgan (Ta'minotchi)</h3>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="client_name"
                label="Ism"
                rules={[{ required: true }]}
              >
                <AutoComplete
                  options={clientOptions}
                  onSelect={handleClientSelect}
                  loading={clientsLoading}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="client_phone" label="Telefon">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="client_address" label="Manzil">
            <Input />
          </Form.Item>

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
