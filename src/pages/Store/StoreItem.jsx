import React, { useState, useEffect, useRef, useMemo } from "react";
import { Table, Input, Select, Button, Popconfirm, message, Modal } from "antd";
import {
  useGetStoreProductsQuery,
  useRemoveProductFromStoreMutation,
  useUpdateQuantityMutation,
} from "../../context/service/store.service";

import AddProductToStore from "../../components/addproduct/AddProductToStore";
import EditProductModal from "../../components/modal/Editmodal";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { FaPrint } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { IoMdAdd } from "react-icons/io";
import ReactToPrint from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

const { Option } = Select;

export default function StoreItem() {
  const {
    data: storeProducts,
    isLoading: storeLoading,
    refetch: refetchStoreProducts,
  } = useGetStoreProductsQuery();

  const [removeProductFromStore] = useRemoveProductFromStoreMutation();
  const [updateQuantity] = useUpdateQuantityMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("newlyAdded");
  const [selectedKimdanKelgan, setSelectedKimdanKelgan] = useState(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [quantityModal, setQuantityModal] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const [printData, setPrintData] = useState(null);
  
  const printRef = useRef();

  useEffect(() => {
    refetchStoreProducts();
  }, [stockFilter, refetchStoreProducts]);

  const handleFilterChange = (value) => setStockFilter(value);

  // ✅ 1) RESPONSE NORMALIZE: array yoki {products: []}
  const storeList = useMemo(() => {
    if (!storeProducts) return [];
    if (Array.isArray(storeProducts)) return storeProducts;
    return storeProducts.products || [];
  }, [storeProducts]);

  // ✅ 2) FORMAT DETECT
  const isStoreFormat = useMemo(() => {
    return storeList.length > 0 && !!storeList[0]?.product_id;
  }, [storeList]);

  // ✅ 3) STORE-LIKE GETTERS
  const getProduct = (item) => (isStoreFormat ? item.product_id : item);
  const getQty = (item) => (isStoreFormat ? item.quantity : item.stock);

  // ✅ sort by created_at
  const sortedList = useMemo(() => {
    const listCopy = [...storeList];
    return listCopy
      .sort((a, b) => {
        const da = new Date(a.created_at || a.createdAt || 0).getTime();
        const db = new Date(b.created_at || b.createdAt || 0).getTime();
        return da - db;
      })
      .reverse();
  }, [storeList]);

  // ✅ filters
  const filteredList = sortedList
    .filter((item) => {
      const p = getProduct(item);
      const query = searchQuery.toLowerCase();
      const barcodeQuery = barcodeSearch.toLowerCase();

      const name = p?.product_name?.toLowerCase() || "";
      const model = p?.model?.toLowerCase() || "";
      const barcode = p?.barcode?.toLowerCase() || "";

      return (
        (name.includes(query) || model.includes(query)) &&
        (!barcodeQuery || barcode.includes(barcodeQuery))
      );
    })
    .filter((item) => {
      const qty = Number(getQty(item) || 0);

      if (stockFilter === "all") return true;
      if (stockFilter === "newlyAdded") return true;
      if (stockFilter === "runningOut") return qty <= 5 && qty > 0;
      if (stockFilter === "outOfStock") return qty === 0;
      return true;
    })
    .filter((item) => {
      const p = getProduct(item);
      return selectedKimdanKelgan
        ? p?.kimdan_kelgan === selectedKimdanKelgan
        : true;
    });

  // ✅ print data
  const preparePrintData = (item) => {
    const p = getProduct(item);
    const priceVal = p?.sell_price ?? 0;
    const priceCurrency = p?.purchase_currency === "usd" ? "$" : "so'm"; // purchase_currency ga o'zgardi

    return {
      name: p?.product_name ?? "Noma'lum",
      model: p?.model ?? "",
      price: `${priceVal.toFixed(0)}${priceCurrency}`,
      barcode: p?.barcode ?? "0000000000000",
      special_notes: p?.special_notes ?? "-",
    };
  };

  // ✅ kimdan_kelgan filter list
  const uniqueKimdanKelgan = useMemo(() => {
    const set = new Set();
    storeList.forEach((item) => {
      const p = getProduct(item);
      if (p?.kimdan_kelgan) set.add(p.kimdan_kelgan);
    });
    return [...set];
  }, [storeList, isStoreFormat]);

  const showEditModal = (item) => {
    const p = getProduct(item);
    setEditingProduct(p);
    setIsEditModalVisible(true);
  };

  const handleEditComplete = () => {
    setIsEditModalVisible(false);
    setEditingProduct(null);
    refetchStoreProducts();
  };

  const handleDelete = async (id) => {
    try {
      await removeProductFromStore(id).unwrap();
      message.success("Mahsulot muvaffaqiyatli o'chirildi!");
      refetchStoreProducts();
    } catch (error) {
      message.error("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  };

  const submitModal = (data) => {
    updateQuantity({ quantity: data.quantity, id: selectedQuantity }).then(
      () => {
        message.success("Mahsulot muvaffaqiyatli o'zgartirildi!");
        setQuantityModal(false);
        refetchStoreProducts();
      }
    );
  };

  // ✅ Valyuta formatlash funksiyasi
  const formatPrice = (price, currency) => {
    if (currency === "usd") {
      return `$${Number(price).toFixed(0)}`;
    } else if (currency === "sum") {
      return `${Number(price).toFixed(0)} so'm`;
    }
    return `${Number(price).toFixed(0)}`;
  };

  // ✅ COLUMNS (formatdan qat'i nazar ishlaydi)
  const columns = [
    {
      title: "Maxsulot nomi",
      key: "product_name",
      render: (_, item) => getProduct(item)?.product_name,
    },
    {
      title: "Modeli",
      key: "modeli",
      render: (_, item) => getProduct(item)?.model,
    },
    {
      title: "Miqdor",
      key: "quantity",
      render: (_, item) => {
        const qty = Number(getQty(item) || 0);
        return (
          <div
            style={{
              backgroundColor:
                qty === 0 ? "red" : qty <= 5 ? "yellow" : "inherit",
              display: "inline-block",
              padding: "15px",
              borderRadius: "3px",
            }}
          >
            {qty}
          </div>
        );
      },
    },
    {
      title: "Olish narxi",
      key: "purchase_price",
      render: (_, item) => {
        const p = getProduct(item);
        const price = p?.purchase_price ?? 0;
        const currency = p?.purchase_currency ?? "usd"; // purchase_currency dan foydalanish
        return formatPrice(price, currency);
      },
    },
    {
      title: "Sotish narxi",
      key: "sell_price",
      render: (_, item) => {
        const p = getProduct(item);
        const price = p?.sell_price ?? 0;
        const currency = p?.purchase_currency ?? "usd"; // Sotish narxi ham purchase_currency ga qarab
        return formatPrice(price, currency);
      },
    },
    {
      title: "O'lchov birligi",
      key: "count_type",
      render: (_, item) => getProduct(item)?.count_type,
    },
  
    {
      title: "QR Kod",
      key: "qrcode",
      render: (_, item) => {
        const p = getProduct(item);
        return (
          <div>
            <ReactToPrint
              trigger={() => (
                <Button type="primary" style={{ marginLeft: 10 }}>
                  <FaPrint /> Chop etish
                </Button>
              )}
              content={() => printRef.current}
              onBeforeGetContent={() =>
                new Promise((resolve) => {
                  setPrintData(preparePrintData(item));
                  setTimeout(resolve, 100);
                })
              }
            />
          </div>
        );
      },
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, item) => {
        // agar Store format bo'lsa amallar chiqadi, Product format bo'lsa yashiramiz
        if (!isStoreFormat) return null;

        return (
          <div>
            <Button
              type="primary"
              style={{ marginRight: "10px" }}
              onClick={() => showEditModal(item)}
            >
              <EditOutlined />
            </Button>

            <Button
              type="primary"
              style={{ marginRight: "10px" }}
              onClick={() => {
                setQuantityModal(true);
                setSelectedQuantity(item._id);
                reset({ quantity: item.quantity });
              }}
            >
              <IoMdAdd />
            </Button>

            <Popconfirm
              title="Haqiqatdan ham ushbu mahsulotni o'chirmoqchimisiz?"
              onConfirm={() => handleDelete(item._id)}
              okText="Ha"
              cancelText="Yo'q"
            >
              <Button type="primary" danger>
                <DeleteOutlined />
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* PRINT TEMPLATE */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          {printData && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "300px",
                height: "200px",
                border: "1px solid #000",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginLeft: "60px",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "25px", fontWeight: "bold" }}>
                    {printData.name}
                  </div>
                  <div style={{ fontSize: "25px", fontWeight: "bold" }}>
                    {printData.model}
                    {printData.sell_price}
                  </div>
                </div>

                <div style={{ fontSize: "25px", fontWeight: "900" }}>
                  <p>{printData.special_notes}</p>
                </div>
                <div style={{ fontSize: "25px", fontWeight: "900" }}>
                  <p>{printData.sell_price}</p>
                  
                </div>
              </div>

              <QRCodeSVG
                style={{ transform: "translateX(-10px)", marginRight: "30px" }}
                value={printData.barcode}
                size={80}
                level="M"
                includeMargin={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* UPDATE QUANTITY MODAL */}
      <Modal
        open={quantityModal}
        footer={null}
        title="Mahsulot sonini o'zgartirish"
        onCancel={() => setQuantityModal(false)}
      >
        <form
          style={{
            paddingInline: "12px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
          onSubmit={handleSubmit(submitModal)}
        >
          <input
            style={{
              width: "40%",
              paddingInline: "6px",
              height: "40px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
            type="number"
            step="0.01"
            {...register("quantity")}
            placeholder="Mahsulot soni"
          />

          <button
            style={{
              background: "#000",
              width: "100%",
              height: "40px",
              borderRadius: "5px",
              color: "#fff",
            }}
          >
            O'zgartirish
          </button>
        </form>
      </Modal>

      {/* FILTERS */}
      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          marginBottom: 20,
          gap: "10px",
          alignItems: "center",
        }}
      >
        {/* 1. Search input */}
        <Input
          placeholder="🔍 Model, nomi bo'yicha qidirish"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "200px", color: "#000" }}
          allowClear
        />

        {/* 3. Stock filter */}
        <Select
          defaultValue="newlyAdded"
          style={{ width: 200 }}
          onChange={handleFilterChange}
        >
          <Option value="newlyAdded">Yangi qo'shilgan mahsulotlar</Option>
          <Option value="all">Barcha mahsulotlar</Option>
          <Option value="runningOut">Tugayotgan mahsulotlar</Option>
          <Option value="outOfStock">Tugagan mahsulotlar</Option>
        </Select>
      </div>

      {/* ADD PRODUCT */}
      <AddProductToStore refetchProducts={refetchStoreProducts} />

      {/* TABLE */}
      <Table
        dataSource={filteredList}
        loading={storeLoading}
        columns={columns}
        rowKey="_id"
        pagination={{ pageSize: 20, defaultCurrent: 1 }}
        scroll={{ x: "max-content" }}
      />

      {/* EDIT MODAL */}
      <EditProductModal
        visible={isEditModalVisible}
        onCancel={handleEditComplete}
        product={editingProduct}
        onSave={refetchStoreProducts}
        isStore={true}
      />
    </div>
  );
}
