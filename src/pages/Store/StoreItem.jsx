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

// ✅ PRINT PAGE STYLE (40mm x 30mm)
const printPageStyle = `
  @page {
    size: 40mm 30mm;
    margin: 0;
  }
  @media print {
    html, body {
      width: 40mm;
      height: 30mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export default function StoreItem() {
  const {
    data: storeProducts,
    isLoading: storeLoading,
    refetch: refetchStoreProducts,
  } = useGetStoreProductsQuery();

  const [removeProductFromStore] = useRemoveProductFromStoreMutation();
  const [updateQuantity] = useUpdateQuantityMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState(""); // agar kerak bo'lsa qoladi
  const [stockFilter, setStockFilter] = useState("newlyAdded");
  const [selectedKimdanKelgan, setSelectedKimdanKelgan] = useState(null); // agar kerak bo'lsa qoladi

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

  // ✅ RESPONSE NORMALIZE
  const storeList = useMemo(() => {
    if (!storeProducts) return [];
    if (Array.isArray(storeProducts)) return storeProducts;
    return storeProducts.products || [];
  }, [storeProducts]);

  // ✅ FORMAT DETECT: store formatmi?
  const isStoreFormat = useMemo(() => {
    return storeList.length > 0 && !!storeList[0]?.product_id;
  }, [storeList]);

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
    const priceCurrency = p?.purchase_currency === "usd" ? "$" : " so'm";

    return {
      name: p?.product_name ?? "Noma'lum",
      model: p?.model ?? "",
      price: `${priceVal.toFixed(0)}${priceCurrency}`,
      barcode: p?.barcode ?? "0000000000000",
      special_notes: p?.special_notes ?? "",
    };
  };

  // ✅ KIRITILGAN MUHIM FIX:
  // Edit modalga yuboriladigan obyekt create formatga 1 xil bo‘ladi
  const normalizeForEdit = (item) => {
    const p = getProduct(item);

    return {
      _id: p?._id,
      product_name: p?.product_name ?? "",
      model: p?.model ?? "",
      barcode: p?.barcode ?? "",
      purchase_price: p?.purchase_price ?? 0,
      sell_price: p?.sell_price ?? 0,
      purchase_currency: p?.purchase_currency ?? "usd",
      count_type: p?.count_type ?? "",
      kimdan_kelgan: p?.kimdan_kelgan ?? "",
      special_notes: p?.special_notes ?? "",
      // create'da qo‘shimcha field bo‘lsa shu yerga ham qo‘shiladi
    };
  };

  const showEditModal = (item) => {
    setEditingProduct(normalizeForEdit(item));
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
      message.success("Mahsulot o'chirildi!");
      refetchStoreProducts();
    } catch (error) {
      message.error("Xatolik yuz berdi.");
    }
  };

  const submitModal = (data) => {
    updateQuantity({ quantity: data.quantity, id: selectedQuantity }).then(
      () => {
        message.success("Miqdor o'zgartirildi!");
        setQuantityModal(false);
        refetchStoreProducts();
      }
    );
  };

  const formatPrice = (price, currency) => {
    if (currency === "usd") return `$${Number(price).toFixed(0)}`;
    if (currency === "sum") return `${Number(price).toFixed(0)} so'm`;
    return `${Number(price).toFixed(0)}`;
  };

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
              padding: "8px",
              borderRadius: "3px",
              minWidth: 30,
              textAlign: "center",
              fontWeight: 700,
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
        return formatPrice(
          p?.purchase_price ?? 0,
          p?.purchase_currency ?? "usd"
        );
      },
    },
    {
      title: "Sotish narxi",
      key: "sell_price",
      render: (_, item) => {
        const p = getProduct(item);
        return formatPrice(p?.sell_price ?? 0, p?.purchase_currency ?? "usd");
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
      render: (_, item) => (
        <ReactToPrint
          pageStyle={printPageStyle}
          trigger={() => (
            <Button type="primary">
              <FaPrint /> Chop etish
            </Button>
          )}
          content={() => printRef.current}
          onBeforeGetContent={() =>
            new Promise((resolve) => {
              setPrintData(preparePrintData(item));
              setTimeout(resolve, 50);
            })
          }
        />
      ),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, item) => {
        if (!isStoreFormat) return null;
        return (
          <div>
            <Button
              type="primary"
              style={{ marginRight: 10 }}
              onClick={() => showEditModal(item)}
            >
              <EditOutlined />
            </Button>

            <Button
              type="primary"
              style={{ marginRight: 10 }}
              onClick={() => {
                setQuantityModal(true);
                setSelectedQuantity(item._id);
                reset({ quantity: item.quantity });
              }}
            >
              <IoMdAdd />
            </Button>

            <Popconfirm
              title="O'chirmoqchimisiz?"
              onConfirm={() => handleDelete(item._id)}
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
      {/* ✅ PRINT TEMPLATE (OFFSCREEN) */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
        }}
      >
        <div ref={printRef}>
          {printData && (
            <div
              style={{
                width: "40mm",
                height: "30mm",
                padding: "1.5mm",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif",
                border: "0.2mm solid #000",
                overflow: "hidden",
                gap: "1mm",
              }}
            >
              {/* LEFT TEXT */}
              <div
                style={{
                  width: "62%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6mm",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: "3.0mm",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {printData.name}
                </div>

                {printData.model && (
                  <div
                    style={{
                      fontSize: "2.1mm",
                      fontWeight: 600,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {printData.model}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "3.2mm",
                    fontWeight: 500,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {printData.price}
                </div>

                {printData.special_notes && (
                  <div
                    style={{
                      fontSize: "2.6mm",
                      opacity: 0.8,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {printData.special_notes}
                  </div>
                )}
              </div>

              {/* RIGHT QR */}
              <div
                style={{
                  width: "35%",
                  textAlign: "center",
                  marginRight: "5px",
                }}
              >
                <QRCodeSVG
                  value={printData.barcode}
                  size={50}
                  level="M"
                  includeMargin={false}
                />
              </div>
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
            paddingInline: 12,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
          onSubmit={handleSubmit(submitModal)}
        >
          <input
            style={{
              width: "40%",
              paddingInline: 6,
              height: 40,
              borderRadius: 5,
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
              height: 40,
              borderRadius: 5,
              color: "#fff",
            }}
          >
            O'zgartirish
          </button>
        </form>
      </Modal>

      {/* FILTERS */}
      <div style={{ display: "flex", marginBottom: 20, gap: 10 }}>
        <Input
          placeholder="Model, nomi bo'yicha qidirish"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          defaultValue="newlyAdded"
          style={{ width: 200 }}
          onChange={handleFilterChange}
        >
          <Option value="newlyAdded">Yangi qo'shilgan</Option>
          <Option value="all">Barchasi</Option>
          <Option value="runningOut">Tugayotgan</Option>
          <Option value="outOfStock">Tugagan</Option>
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
        pagination={{ pageSize: 20 }}
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
