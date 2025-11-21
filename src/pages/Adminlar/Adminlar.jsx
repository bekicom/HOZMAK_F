import React, { useState } from "react";
import { Button, Modal, Form, Input, message, Checkbox, Table } from "antd";
import {
  UserAddOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  useSignUpAsAdminMutation,
  useGetAdminsQuery,
  useDeleteAdminMutation,
  useUpdateAdminMutation,
} from "../../context/service/adminlar.service";

const { confirm } = Modal;

export default function Adminlar() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  const [signUpAsAdmin] = useSignUpAsAdminMutation();
  const { data: admins, isLoading, refetch } = useGetAdminsQuery();
  const [deleteAdmin] = useDeleteAdminMutation();
  const [updateAdmin] = useUpdateAdminMutation();

  const [form] = Form.useForm();

  const showModal = () => setIsModalVisible(true);

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingAdmin(null);
    form.resetFields();
  };

  const buildPermissions = (successArr = []) => ({
    xisobot: successArr.includes("xisobot"),
    yetkazibberuvchi: successArr.includes("yetkazibberuvchi"), // ✅ NEW
    qarzdorlar: successArr.includes("qarzdorlar"),
    xarajatlar: successArr.includes("xarajatlar"),
    skaladorlar: successArr.includes("skaladorlar"),
    vazvratlar: successArr.includes("vazvratlar"),
    adminlar: successArr.includes("adminlar"),
    sotuv_tarixi: successArr.includes("sotuv_tarixi"),
    dokon: successArr.includes("dokon"),
    SalesStatistics: successArr.includes("SalesStatistics"),
  });

  const handleFinish = async (values) => {
    const { name, login, password, success = [] } = values;

    const payload = {
      name,
      login,
      password,
      success: buildPermissions(success),
    };

    try {
      await signUpAsAdmin(payload).unwrap();
      message.success("Admin muvaffaqiyatli qo'shildi!");
      setIsModalVisible(false);
      form.resetFields();
      refetch();
    } catch (err) {
      console.error("Xatolik:", err);
      message.error(
        err?.data?.message || "Adminni qo'shishda xatolik yuz berdi."
      );
    }
  };

  const handleEditFinish = async (values) => {
    const { name, login, password, success = [] } = values;

    const payload = {
      id: editingAdmin._id,
      name,
      login,
      password,
      success: buildPermissions(success),
    };

    try {
      await updateAdmin(payload).unwrap();
      message.success("Admin muvaffaqiyatli yangilandi!");
      setIsEditModalVisible(false);
      setEditingAdmin(null);
      form.resetFields();
      refetch();
    } catch (err) {
      console.error("Xatolik:", err);
      message.error(
        err?.data?.message || "Adminni yangilashda xatolik yuz berdi."
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdmin(id).unwrap();
      message.success("Admin muvaffaqiyatli o'chirildi!");
      refetch();
    } catch (error) {
      console.error("Xatolik:", error);
      message.error(
        error?.data?.message || "Adminni o'chirishda xatolik yuz berdi."
      );
    }
  };

  const showDeleteConfirm = (id) => {
    confirm({
      title: "Bu adminni o'chirishni istaysizmi?",
      icon: <ExclamationCircleOutlined />,
      content: "Bu harakatni qaytarishning imkoni yo'q!",
      okText: "Ha",
      okType: "danger",
      cancelText: "Yo'q",
      onOk() {
        handleDelete(id);
      },
    });
  };

  const columns = [
    { title: "Ism", dataIndex: "name", key: "name" },
    { title: "Login", dataIndex: "login", key: "login" },

    {
      title: "Adminlar",
      dataIndex: ["success", "adminlar"],
      key: "adminlar",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Xisobot",
      dataIndex: ["success", "xisobot"],
      key: "xisobot",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },

    // ✅ NEW COLUMN
    {
      title: "Yetkazibberuvchi",
      dataIndex: ["success", "yetkazibberuvchi"],
      key: "yetkazibberuvchi",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },

    {
      title: "Qarzdorlar",
      dataIndex: ["success", "qarzdorlar"],
      key: "qarzdorlar",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Xarajatlar",
      dataIndex: ["success", "xarajatlar"],
      key: "xarajatlar",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Skaladorlar",
      dataIndex: ["success", "skaladorlar"],
      key: "skaladorlar",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Vazvratlar",
      dataIndex: ["success", "vazvratlar"],
      key: "vazvratlar",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Sotuv tarixi",
      dataIndex: ["success", "sotuv_tarixi"],
      key: "sotuv_tarixi",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Dokon",
      dataIndex: ["success", "dokon"],
      key: "dokon",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Statistika",
      dataIndex: ["success", "SalesStatistics"],
      key: "SalesStatistics",
      render: (v) => (v ? "Ha" : "Yo'q"),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, record) => (
        <>
          <Button
            type="primary"
            style={{ marginRight: 10 }}
            onClick={() => {
              setEditingAdmin(record);
              setIsEditModalVisible(true);
              form.setFieldsValue({
                name: record.name,
                login: record.login,
                password: record.password,
                success: Object.keys(record.success || {}).filter(
                  (key) => record.success[key]
                ),
              });
            }}
          >
            <EditOutlined /> Tahrirlash
          </Button>

          <Button
            type="primary"
            danger
            onClick={() => showDeleteConfirm(record._id)}
          >
            O'chirish
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        icon={<UserAddOutlined />}
        onClick={showModal}
        style={{ marginBottom: 10 }}
      >
        Admin qo'shish
      </Button>

      {/* CREATE MODAL */}
      <Modal
        title="Admin Qo'shish"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        style={{ marginTop: 50 }}
      >
        <Form layout="vertical" onFinish={handleFinish} form={form}>
          <Form.Item
            label="Ism"
            name="name"
            rules={[{ required: true, message: "Ismni kiriting!" }]}
          >
            <Input placeholder="Ism" />
          </Form.Item>

          <Form.Item
            label="Login"
            name="login"
            rules={[{ required: true, message: "Loginni kiriting!" }]}
          >
            <Input placeholder="Login" />
          </Form.Item>

          <Form.Item
            label="Parol"
            name="password"
            rules={[{ required: true, message: "Parolni kiriting!" }]}
          >
            <Input.Password placeholder="Parol" />
          </Form.Item>

          <Form.Item label="Ruxsatlar" name="success">
            <Checkbox.Group>
              <Checkbox value="xisobot">Xisobot</Checkbox>
              <Checkbox value="yetkazibberuvchi">
                Yetkazibberuvchi
              </Checkbox>{" "}
              {/* ✅ NEW */}
              <Checkbox value="qarzdorlar">Qarzdorlar</Checkbox>
              <Checkbox value="xarajatlar">Xarajatlar</Checkbox>
              <Checkbox value="skaladorlar">Skaladorlar</Checkbox>
              <Checkbox value="vazvratlar">Vazvratlar</Checkbox>
              <Checkbox value="adminlar">Adminlar</Checkbox>
              <Checkbox value="sotuv_tarixi">Sotuv tarixi</Checkbox>
              <Checkbox value="dokon">Dokon</Checkbox>
              <Checkbox value="SalesStatistics">Statistika</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Saqlash
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        title="Adminni Tahrirlash"
        open={isEditModalVisible}
        onCancel={handleEditCancel}
        footer={null}
        style={{ marginTop: 50 }}
      >
        <Form layout="vertical" onFinish={handleEditFinish} form={form}>
          <Form.Item
            label="Ism"
            name="name"
            rules={[{ required: true, message: "Ismni kiriting!" }]}
          >
            <Input placeholder="Ism" />
          </Form.Item>

          <Form.Item
            label="Login"
            name="login"
            rules={[{ required: true, message: "Loginni kiriting!" }]}
          >
            <Input placeholder="Login" />
          </Form.Item>

          <Form.Item
            label="Parol"
            name="password"
            rules={[{ required: true, message: "Parolni kiriting!" }]}
          >
            <Input.Password placeholder="Parol" />
          </Form.Item>

          <Form.Item label="Ruxsatlar" name="success">
            <Checkbox.Group>
              <Checkbox value="xisobot">Xisobot</Checkbox>
              <Checkbox value="yetkazibberuvchi">
                Yetkazibberuvchi
              </Checkbox>{" "}
              {/* ✅ NEW */}
              <Checkbox value="qarzdorlar">Qarzdorlar</Checkbox>
              <Checkbox value="xarajatlar">Xarajatlar</Checkbox>
              <Checkbox value="skaladorlar">Skaladorlar</Checkbox>
              <Checkbox value="vazvratlar">Vazvratlar</Checkbox>
              <Checkbox value="adminlar">Adminlar</Checkbox>
              <Checkbox value="sotuv_tarixi">Sotuv tarixi</Checkbox>
              <Checkbox value="dokon">Dokon</Checkbox>
              <Checkbox value="SalesStatistics">Statistika</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Saqlash
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Table
        dataSource={admins || []}
        columns={columns}
        loading={isLoading}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
