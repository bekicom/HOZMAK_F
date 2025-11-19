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
  Tabs,
  Table,
  AutoComplete,
  Popconfirm,
} from "antd";
import "antd/dist/reset.css";
import { Option } from "antd/es/mentions";
import "./admin.css";

import {
  useCreateProductMutation,
  useGetAllProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from "../../context/service/addproduct.service";

import {
  PlusOutlined,
  UserAddOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import Adminlar from "../Adminlar/Adminlar";
import Sotuv_tarix from "../sotuv-tarix/Sotuv_tarix";
import Qarzdor from "../qarzdorlar/Qarzdor";
import StoreItem from "../Store/StoreItem";
import Xisobot from "../Xisobod/Xisobot";
import EditProductModal from "../../components/modal/Editmodal";
import {
  useGetUsdRateQuery,
  useUpdateUsdRateMutation,
} from "../../context/service/usd.service";

import PrintBarcodeModal from "../../components/print/PrintBarcodeModal";
import { useAddProductToStoreMutation } from "../../context/service/store.service";
import SalesStatistics from "../SalesStatistics/SalesStatistics";
import { FaPrint } from "react-icons/fa";
import { BiTransfer } from "react-icons/bi";
import MastersModal from "../../components/masters/MastersModal";

export const Admin = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [mastersModalOpen, setMastersModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [form] = Form.useForm();
  const [barcode, setBarcode] = useState("");

  const [createProduct] = useCreateProductMutation();
  const { data, error, isLoading, refetch } = useGetAllProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [addProductToStore] = useAddProductToStoreMutation();

  const access = JSON.parse(localStorage.getItem("acsess"));
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: usdRateData } = useGetUsdRateQuery();
  const [updateUsdRate] = useUpdateUsdRateMutation();
  const [usdRate, setUsdRate] = useState(usdRateData?.rate || 1);

  const [productNames, setProductNames] = useState([]);
  const [brandNames, setBrandNames] = useState([]);
  const [kimdan_kelgan, setKimdanKelgan] = useState([]);
  const [models, setModels] = useState([]);
  const [packingTypes, setPackingTypes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  // === YANGI MUHIM QISM: DATA → MASSIVGA AYLANTIRILADI ===
  const list = Array.isArray(data) ? data : data?.products || [];

  // === PROFIT HISOBLASH ===
  useEffect(() => {
    if (list.length > 0) {
      const profit = list.reduce((acc, product) => {
        return (
          acc + (product.sell_price - product.purchase_price) * product.stock
        );
      }, 0);

      const uniqueProductNames = [...new Set(list.map((p) => p.product_name))];
      const uniqueBrandNames = [...new Set(list.map((p) => p.brand_name))];
      const uniqueModels = [...new Set(list.map((p) => p.model))];
      const uniquePackingTypes = [...new Set(list.map((p) => p.packing_type))];
      const uniqueKimdanKelgan = [...new Set(list.map((p) => p.kimdan_kelgan))];

      setProductNames(uniqueProductNames.sort());
      setBrandNames(uniqueBrandNames);
      setModels(uniqueModels);
      setPackingTypes(uniquePackingTypes);
      setKimdanKelgan(uniqueKimdanKelgan);
    }
  }, [data]);

  const filteredData = list
    .filter((product) => {
      if (stockFilter === "all") return true;
      if (stockFilter === "runningOut")
        return product.stock <= 5 && product.stock > 0;
      if (stockFilter === "outOfStock") return product.stock === 0;
      return true;
    })
    .filter((product) => {
      const searchLower = searchText.toLowerCase();
      return (
        product.product_name.toLowerCase().includes(searchLower) ||
        product.model.toLowerCase().includes(searchLower) ||
        product.product_category?.toLowerCase().includes(searchLower)
      );
    });

  const reversedData = [...filteredData].reverse();

  // Barcode generator
  useEffect(() => {
    if (isModalOpen) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setBarcode(code);
    }
  }, [isModalOpen]);

  const showModal = () => setIsModalOpen(true);
  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id).unwrap();
      message.success("Mahsulot muvaffaqiyatli o'chirildi!");
      refetch();
    } catch (error) {
      message.error("Xatolik yuz berdi!");
    }
  };

  // Transfer Modal
  const showTransferModal = (product) => {
    setSelectedProduct(product);
    setIsTransferModalOpen(true);
  };

  const handleTransferCancel = () => {
    setSelectedProduct(null);
    setIsTransferModalOpen(false);
  };

  // PRODUCT TRANSFER TO STORE
  const handleAddToStore = async (values) => {
    try {
      await addProductToStore({
        product_id: selectedProduct._id,
        quantity: Number(values.quantity),
      }).unwrap();

      message.success("Dokonga muvaffaqiyatli o'tkazildi!");
      setIsTransferModalOpen(false);
      refetch();
    } catch (e) {
      message.error("Xatolik yuz berdi!");
    }
  };

  // Modal column definitions
  const columns = [
    { title: "Mahsulot nomi", dataIndex: "product_name" },
    { title: "Model", dataIndex: "model" },
    {
      title: "Miqdor",
      dataIndex: "stock",
      render: (text) => (
        <div
          style={{
            backgroundColor:
              text === 0 ? "red" : text <= 5 ? "yellow" : "inherit",
            padding: 6,
            textAlign: "center",
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: "Olish narxi",
      dataIndex: "purchase_price",
      render: (p) => p.toFixed(2),
    },
    {
      title: "Sotish narxi",
      dataIndex: "sell_price",
      render: (p) => p.toFixed(2),
    },

    {
      title: "Shtrix kod",
      dataIndex: "barcode",
      render: (barcode) => (
        <Button
          onClick={() => {
            setBarcode(barcode);
            setIsPrintModalOpen(true);
          }}
        >
          <FaPrint />
        </Button>
      ),
    },

    {
      title: "Amallar",
      render: (_, record) => (
        <>
          <Button
            style={{ marginRight: 10 }}
            onClick={() => {
              setEditingProduct(record);
              setIsEditModalOpen(true);
            }}
          >
            <EditOutlined />
          </Button>

          <Button
            style={{ marginRight: 10 }}
            onClick={() => showTransferModal(record)}
          >
            <BiTransfer />
          </Button>

          <Popconfirm
            title="O'chirilsinmi?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger>
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="admin-container">
      <Tabs defaultActiveKey="1">
        {access?.dokon && (
          <Tabs.TabPane tab={<Button type="primary">Dokon</Button>} key="1">
            <StoreItem />
          </Tabs.TabPane>
        )}

        {access?.adminlar && (
          <Tabs.TabPane tab={<Button>Admin qo'shish</Button>} key="3">
            <Adminlar />
          </Tabs.TabPane>
        )}

        {access?.qarzdorlar && (
          <Tabs.TabPane tab={<Button danger>Qarzdorlar</Button>} key="4">
            <Qarzdor />
          </Tabs.TabPane>
        )}

        {access?.xisobot && (
          <Tabs.TabPane tab={<Button>Xisobot</Button>} key="5">
            <Xisobot />
          </Tabs.TabPane>
        )}

        {access?.sotuv_tarixi && (
          <Tabs.TabPane tab={<Button>Sotuv tarixi</Button>} key="6">
            <Sotuv_tarix />
          </Tabs.TabPane>
        )}

        {access?.SalesStatistics && (
          <Tabs.TabPane tab={<Button>Statistika</Button>} key="7">
            <SalesStatistics />
          </Tabs.TabPane>
        )}
      </Tabs>

      {/* MODALS */}
      <EditProductModal
        visible={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        product={editingProduct}
        usdRate={usdRate}
      />

      <PrintBarcodeModal
        visible={isPrintModalOpen}
        onCancel={() => setIsPrintModalOpen(false)}
        barcode={barcode}
      />

      <MastersModal
        visible={mastersModalOpen}
        onClose={() => setMastersModalOpen(false)}
      />
    </div>
  );
};

export default Admin;
