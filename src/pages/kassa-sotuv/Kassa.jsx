import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
  Input,
  Table,
  Card,
  Button,
  Modal,
  Select,
  message,
  Form,
  Input as AntdInput,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "../../context/service/addproduct.service";
import {
  useGetSalesHistoryQuery,
  useRecordSaleMutation,
} from "../../context/service/sale.service";
import {
  useSellProductFromStoreMutation,
  useGetStoreProductsQuery,
  useUpdateQuantityMutation,
} from "../../context/service/store.service";
import {
  useCreateDebtorMutation,
  useEditDebtorMutation,
  useGetDebtorsQuery,
} from "../../context/service/debtor.service";
import { useGetUsdRateQuery } from "../../context/service/usd.service";
import "./Kassa.css";
import Qarzdor from "../qarzdorlar/Qarzdor";
import Xarajatlar from "../Xarajatlar/Xarajatlar";
import { useReactToPrint } from "react-to-print";
import moment from "moment-timezone";
import Vazvrat from "../vazvrat/Vazvrat";
import logo from "../../assets/logo.png";
import { debounce } from "lodash";
import SotuvTarix from "../sotuv-tarix/Sotuv_tarix";
import {
  useCompleteNasiyaMutation,
  useCreateNasiyaMutation,
  useGetNasiyaQuery,
} from "../../context/service/nasiya.service";
import {
  useCreateCarToMasterMutation,
  useCreateMasterMutation,
  useCreatePaymentToMasterMutation,
  useCreateSaleToCarMutation,
  useGetMastersQuery,
} from "../../context/service/master.service";
import MastersModal from "../../components/masters/MastersModal";
import tg from "../../assets/in.png";
import instagram from "../../assets/qr-code.png";
import ChekModal from "../../components/ChekModal";
const { Option } = Select;

export default function Kassa() {
  const { data: sales = [] } = useGetSalesHistoryQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("naqd");
  const [debtorName, setDebtorName] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [chekModal, setChekModal] = useState(false);
  const [qarzdorModalVisible, setQarzdorModalVisible] = useState(false);
  const [xarajatlarModalVisible, setXarajatlarModalVisible] = useState(false);
  const [vazvratModalVisible, setVazvratModalVisible] = useState(false);
  const receiptRef = useRef();
  const [debtDueDate, setDebtDueDate] = useState(null);
  const [updateQuantity] = useUpdateQuantityMutation();

  // ✅ Scanner input ref (focus uchun)
  const searchInputRef = useRef(null);

  // API dan keladigan ma'lumotlarni to'g'ri parse qilish
  const {
    data: productsResponse,
    isLoading,
    refetch: productRefetch,
  } = useGetAllProductsQuery();

  const { data: storeProductsResponse, refetch: storeRefetch } =
    useGetStoreProductsQuery();

  // Ma'lumotlarni massivga aylantirish
  const products = useMemo(() => {
    if (!productsResponse) return [];
    if (Array.isArray(productsResponse)) return productsResponse;
    if (productsResponse.products && Array.isArray(productsResponse.products)) {
      return productsResponse.products;
    }
    if (productsResponse.data && Array.isArray(productsResponse.data)) {
      return productsResponse.data;
    }
    if (productsResponse.result && Array.isArray(productsResponse.result)) {
      return productsResponse.result;
    }
    console.warn("Unexpected products response format:", productsResponse);
    return [];
  }, [productsResponse]);

  const storeProducts = useMemo(() => {
    if (!storeProductsResponse) return [];
    if (Array.isArray(storeProductsResponse)) return storeProductsResponse;
    if (
      storeProductsResponse.products &&
      Array.isArray(storeProductsResponse.products)
    ) {
      return storeProductsResponse.products;
    }
    if (
      storeProductsResponse.data &&
      Array.isArray(storeProductsResponse.data)
    ) {
      return storeProductsResponse.data;
    }
    if (
      storeProductsResponse.result &&
      Array.isArray(storeProductsResponse.result)
    ) {
      return storeProductsResponse.result;
    }
    console.warn(
      "Unexpected store products response format:",
      storeProductsResponse
    );
    return [];
  }, [storeProductsResponse]);

  const { data: usdRateData } = useGetUsdRateQuery();
  const [updateProduct] = useUpdateProductMutation();
  const [recordSale] = useRecordSaleMutation();
  const [sellProductFromStore] = useSellProductFromStoreMutation();
  const [createMaster] = useCreateMasterMutation();
  const { data: masters = [] } = useGetMastersQuery();
  const [createCarToMaster] = useCreateCarToMasterMutation();
  const [createSaleToCar] = useCreateSaleToCarMutation();
  const [createPaymentToMaster] = useCreatePaymentToMasterMutation();
  const [createDebtor] = useCreateDebtorMutation();
  const [location, setLocation] = useState("dokon");
  const [sotuvtarixiModalVisible, setSotuvtarixiModalVisible] = useState(false);
  const [currency, setCurrency] = useState("sum");
  const [nasiyaModal, setNasiyaModal] = useState(false);
  const [createNasiya] = useCreateNasiyaMutation();
  const [completeNasiya] = useCompleteNasiyaMutation();
  const { data: nasiya = [] } = useGetNasiyaQuery();
  const [nasiyaModalVisible, setNasiyaModalVisible] = useState(false);
  const [nasiyaPaymentMethod, setNasiyaPaymentMethod] = useState("naqd");
  const [sellPrice, setSellPrice] = useState(null);
  const { data: debtors = [] } = useGetDebtorsQuery();
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [editDebtor] = useEditDebtorMutation();
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [newMasterName, setNewMasterName] = useState("");
  const [selectedCarName, setSelectedCarName] = useState(null);
  const [newCarName, setNewCarName] = useState("");
  const [masterModal, setMasterModal] = useState(false);
  const [chekBolimModal, setChekBolimModal] = useState(false);

  const usdRate = usdRateData?.rate || 1;

  const convertPrice = useCallback(
    (price, fromCurrency, toCurrency) => {
      if (fromCurrency === toCurrency) return price;
      if (fromCurrency === "usd" && toCurrency === "sum")
        return price * usdRate;
      if (fromCurrency === "sum" && toCurrency === "usd")
        return price / usdRate;
      return price;
    },
    [usdRate]
  );

  // ===============================
  // ✅ SCANNER LOGIC (YANGI)
  // ===============================
  const normalizeBarcode = (v) => String(v || "").trim();

  const findProductByBarcode = useCallback(
    (barcode) => {
      const code = normalizeBarcode(barcode).toLowerCase();
      if (!code) return null;

      return products.find(
        (p) => normalizeBarcode(p.barcode).toLowerCase() === code
      );
    },
    [products]
  );

  const handleScanBarcode = useCallback(
    (barcode) => {
      const code = normalizeBarcode(barcode);
      if (!code) return;

      const product = findProductByBarcode(code);

      if (!product) {
        message.error(`Barcode topilmadi: ${code}`);
        return;
      }

      const storeProduct = storeProducts?.find(
        (item) => item.product_id?._id === product._id
      );
      const storeQty = storeProduct?.quantity || 0;

      if (storeQty <= 0) {
        message.warning(
          `${product.product_name} mahsuloti dokonda mavjud emas! (Miqdor: 0)`
        );
        return;
      }

      setSelectedProducts((prev) => {
        const idx = prev.findIndex((i) => i._id === product._id);

        // ✅ Yangi mahsulot qo‘shish
        if (idx === -1) {
          const firstQty = ["litr", "sm"].includes(product.count_type)
            ? 0.1
            : 1;

          return [
            ...prev,
            {
              ...product,
              quantity: firstQty,
              sell_price: convertPrice(
                product.sell_price,
                product.currency,
                currency
              ),
              currency,
            },
          ];
        }

        // ✅ Bor mahsulot bo‘lsa sonini oshirish
        const next = [...prev];
        const item = next[idx];
        const step = ["litr", "sm"].includes(item.count_type) ? 0.1 : 1;
        const newQty = parseFloat(
          (Number(item.quantity || 0) + step).toFixed(2)
        );

        if (newQty > storeQty) {
          message.warning(
            `${product.product_name} dokonda yetarli emas! (Miqdor: ${storeQty})`
          );
          return prev;
        }

        next[idx] = { ...item, quantity: newQty };
        return next;
      });

      // ✅ scanner input tozalash
      setSearchTerm("");

      // ✅ input fokusni qaytarish
      setTimeout(() => searchInputRef.current?.focus(), 0);
    },
    [findProductByBarcode, storeProducts, convertPrice, currency]
  );

  // ✅ Sahifa ochilganda inputga fokus
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ===============================
  // ✅ Oldingi kodlar (o‘zgarmadi)
  // ===============================
  const productSalesMap = useMemo(() => {
    const map = {};
    sales?.forEach((sale) => {
      const productId = sale.product_id?._id;
      if (productId) {
        map[productId] = (map[productId] || 0) + (sale.quantity || 0);
      }
    });
    return map;
  }, [sales]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    return products
      .filter((product) => {
        if (!searchTerm) return false; // Faqat qidiruv bo'lsa ko'rsat
        const searchWords = searchTerm.toLowerCase().split(" ");
        const fields = [
          product.product_name?.toLowerCase() || "",
          product.barcode?.toLowerCase() || "",
          product.product_category?.toLowerCase() || "",
          product.model?.toLowerCase() || "",
          product.brand_name?.toLowerCase() || "",
        ];
        const matchesSearch = searchWords.every((word) =>
          fields.some((field) => field.includes(word))
        );
        const storeProduct = storeProducts?.find(
          (item) => item.product_id?._id === product._id
        );
        const hasStoreStock = (storeProduct?.quantity || 0) > 0;
        return matchesSearch && hasStoreStock;
      })
      .map((product) => ({
        ...product,
        soldQuantity: productSalesMap[product._id] || 0,
      }))
      .sort((a, b) => b.soldQuantity - a.soldQuantity);
  }, [products, searchTerm, storeProducts, productSalesMap]);

  const totalAmount = useMemo(() => {
    return selectedProducts.reduce((acc, product) => {
      const convertedPrice = convertPrice(
        product.sell_price,
        product.currency,
        currency
      );
      return acc + convertedPrice * product.quantity;
    }, 0);
  }, [selectedProducts, currency, convertPrice]);

  const handleSelectProduct = useCallback(
    (product) => {
      const storeProduct = storeProducts?.find(
        (item) => item.product_id?._id === product._id
      );
      const storeQuantity = storeProduct?.quantity || 0;
      if (storeQuantity === 0) {
        message.warning(
          `${product.product_name} mahsuloti dokonda mavjud emas! (Miqdor: 0)`
        );
        return;
      }
      const exists = selectedProducts?.find((item) => item._id === product._id);
      if (!exists) {
        setSelectedProducts((prev) => [
          ...prev,
          {
            ...product,
            quantity: 1,
            sell_price: convertPrice(
              product.sell_price,
              product.currency,
              currency
            ),
            currency,
          },
        ]);
        setSearchTerm("");
      } else {
        message.info("Bu mahsulot allaqachon tanlangan");
      }
    },
    [storeProducts, selectedProducts, currency, convertPrice]
  );

  const handleRemoveProduct = useCallback((productId) => {
    setSelectedProducts((prev) =>
      prev.filter((item) => item._id !== productId)
    );
  }, []);

  const handleQuantityChange = useCallback((productId, increment) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item._id === productId) {
          const isDecimal = ["litr", "sm"].includes(item.count_type);
          const step = isDecimal ? 0.1 : 1;
          const newQuantity = parseFloat(
            (item.quantity + increment * step).toFixed(2)
          );
          return {
            ...item,
            quantity: newQuantity >= step ? newQuantity : step,
          };
        }
        return item;
      })
    );
  }, []);

  const debouncedQuantityUpdate = useRef(
    debounce((productId, newQuantity) => {
      setSelectedProducts((prev) =>
        prev.map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity:
                  newQuantity >=
                  (["litr", "sm"].includes(item.count_type) ? 0.1 : 1)
                    ? newQuantity
                    : ["litr", "sm"].includes(item.count_type)
                    ? 0.1
                    : 1,
              }
            : item
        )
      );
    }, 400)
  ).current;

  const handleQuantityInputChange = useCallback(
    (productId, value) => {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        debouncedQuantityUpdate(productId, parsedValue);
      }
    },
    [debouncedQuantityUpdate]
  );

  const handleSellPriceChange = useCallback(
    (productId, newPrice) => {
      setSelectedProducts((prev) =>
        prev.map((item) => {
          if (item._id === productId) {
            const numericPrice = parseFloat(newPrice) || 0;
            return {
              ...item,
              sell_price: numericPrice,
              currency,
            };
          }
          return item;
        })
      );
    },
    [currency]
  );

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSellProducts = async () => {
    setChekModal(true);
    try {
      const debtorProducts = [];
      let masterId = selectedMasterId;

      if (masterId === "new" && newMasterName?.trim()) {
        const { result } = await createMaster({
          master_name: newMasterName,
        }).unwrap();
        masterId = result._id;
      }

      let carId = null;
      const currentMaster = masters.find((m) => m._id === masterId);

      if (paymentMethod === "master") {
        if (masterId && selectedCarName === "new" && newCarName?.trim()) {
          const { car } = await createCarToMaster({
            master_id: masterId,
            car: { car_name: newCarName },
          }).unwrap();
          carId = car._id;
        } else if (masterId && selectedCarName) {
          const car = currentMaster?.cars?.find(
            (c) => c.car_name === selectedCarName
          );
          carId = car?._id;
        }
      }

      for (const product of selectedProducts) {
        const sellPrice = convertPrice(
          product.sell_price,
          product.currency,
          currency
        );
        const buyPrice = convertPrice(
          product.purchase_price,
          product.currency,
          currency
        );

        if (location === "skalad") {
          if (product.stock < product.quantity) {
            message.error(
              `${product.product_name} mahsuloti skaladda yetarli emas!`
            );
            return;
          }
          await updateProduct({
            id: product._id,
            stock: product.stock - product.quantity,
          }).unwrap();
        }

        if (location === "dokon") {
          const storeProduct = storeProducts?.find(
            (p) => p.product_id?._id === product._id
          );
          if (!storeProduct || storeProduct.quantity < product.quantity) {
            message.error(
              `${product.product_name} mahsuloti dokonda yetarli emas!`
            );
            return;
          }
          await sellProductFromStore({
            product_id: product._id,
            quantity: product.quantity,
          }).unwrap();
        }

        const commonSaleData = {
          product_id: product._id,
          product_name: product.product_name,
          sell_price: sellPrice,
          buy_price: buyPrice,
          currency,
          quantity: product.quantity,
          total_price: sellPrice * product.quantity,
          total_price_sum:
            currency === "usd"
              ? sellPrice * product.quantity * usdRate
              : sellPrice * product.quantity,
        };

        if (paymentMethod === "master") {
          if (!masterId || !carId) {
            message.error("Usta yoki mashina aniqlanmadi");
            return;
          }
          await createSaleToCar({
            master_id: masterId,
            car_id: carId,
            sale: commonSaleData,
          }).unwrap();
        } else if (paymentMethod === "qarz") {
          debtorProducts.push({
            ...commonSaleData,
            due_date: debtDueDate,
          });
        } else {
          await recordSale({
            ...commonSaleData,
            payment_method: paymentMethod,
            debtor_name: null,
            debtor_phone: null,
            due_date: null,
          }).unwrap();
        }
      }

      if (paymentMethod === "qarz" && debtorProducts.length > 0) {
        const totalDebt = debtorProducts.reduce(
          (acc, p) => acc + p.sell_price * p.quantity,
          0
        );

        if (!selectedDebtor) {
          await createDebtor({
            name: debtorName?.trim(),
            phone: debtorPhone?.trim(),
            due_date: debtDueDate,
            currency,
            debt_amount: totalDebt,
            products: debtorProducts,
          }).unwrap();
        } else {
          const debtor = debtors.find((d) => d._id === selectedDebtor);
          if (!debtor) {
            message.error("Tanlangan qarzdor topilmadi");
            return;
          }

          for (const item of debtorProducts) {
            await updateQuantity({
              id: storeProducts.find(
                (p) => p.product_id._id === item.product_id
              )._id,
              quantity:
                storeProducts.find((p) => p.product_id._id === item.product_id)
                  .quantity - item.quantity,
            }).unwrap();
          }

          const updatedDebt = totalDebt + (debtor.debt_amount || 0);
          const updatedProducts = [
            ...(debtor.products || []),
            ...debtorProducts,
          ];

          await editDebtor({
            id: selectedDebtor,
            body: {
              debt_amount: updatedDebt,
              due_date: debtDueDate,
              products: updatedProducts,
            },
          }).unwrap();
        }
      }

      await storeRefetch();
      await productRefetch();
      message.success("Mahsulotlar muvaffaqiyatli sotildi!");
      setIsModalVisible(false);
    } catch (error) {
      console.error("Xatolik:", error);
      message.error(
        `Xatolik: ${error.data?.message || "Serverga ulanishda muammo"}`
      );
    }
  };

  const handleNasiyaSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const name = e.target.name.value;
      const location = e.target.location.value;

      if (!name) {
        message.error("Ismni to'ldiring!");
        return;
      }
      if (!location) {
        message.error("Joylashuvni to'ldiring!");
        return;
      }

      try {
        for (const product of selectedProducts) {
          if (location === "skalad") {
            if (product.stock < product.quantity) {
              message.error(
                `${product.product_name} mahsuloti skaladda yetarli emas!`
              );
              return;
            }
            await createNasiya({
              product_id: product._id,
              product_name: product.product_name,
              quantity: product.quantity,
              location: location,
              nasiya_name: name,
            });
          } else {
            const storeProduct = storeProducts?.find(
              (p) => p.product_id?._id === product._id
            );
            if (!storeProduct) {
              message.error(
                `${product.product_name} mahsuloti dokonda mavjud emas!`
              );
              return;
            }
            if (storeProduct.quantity < product.quantity) {
              message.error(
                `${product.product_name} mahsuloti dokonda yetarli emas!`
              );
              return;
            }
            await createNasiya({
              product_id: product._id,
              quantity: product.quantity,
              location: location,
              nasiya_name: name,
            });
          }
        }
        message.success("Mahsulotlar muvaffaqiyatli nasiyaga berildi!");
        setNasiyaModal(false);
        setSelectedProducts([]);
        storeRefetch();
        productRefetch();
      } catch (error) {
        console.error("Xatolik:", error);
        message.error("Xatolik yuz berdi, iltimos qayta urinib ko'ring!");
      }
    },
    [
      selectedProducts,
      storeProducts,
      createNasiya,
      storeRefetch,
      productRefetch,
    ]
  );

  const handleCompleteNasiya = useCallback(
    async (item) => {
      if (!sellPrice) {
        message.error("Sotish narxini kiriting!");
        return;
      }
      try {
        await completeNasiya({
          id: item._id,
          sell_price: Number(sellPrice),
          payment_method: nasiyaPaymentMethod,
        });
        message.success("Nasiya yopildi");
        setSellPrice(null);
        setNasiyaPaymentMethod("naqd");
      } catch (error) {
        message.error("Xatolik yuz berdi!");
      }
    },
    [sellPrice, nasiyaPaymentMethod, completeNasiya]
  );

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: "new document",
    pageStyle: "style",
    onAfterPrint: () => {
      setChekModal(false);
      setSelectedProducts([]);
    },
  });

  const productColumns = useMemo(
    () => [
      { title: "Modeli", dataIndex: "model", key: "model" },
      {
        title: "Mahsulot nomi",
        dataIndex: "product_name",
        key: "product_name",
      },
      {
        title: "Tan narxi",
        dataIndex: "purchase_price",
        key: "purchase_price",
        render: (text) => (
          <Tooltip title={text?.toLocaleString()}>
            <span style={{ cursor: "pointer" }}>******</span>
          </Tooltip>
        ),
      },
      {
        title: "Narxi",
        dataIndex: "sell_price",
        key: "sell_price",
        render: (_, record) => (
          <span>
            {convertPrice(
              record.sell_price,
              record.currency,
              currency
            ).toLocaleString()}
            {currency === "usd" ? " USD" : " So'm"}
          </span>
        ),
      },
      {
        title: "Dokon Miqdori",
        dataIndex: "quantity",
        key: "quantity",
        render: (_, record) =>
          storeProducts
            ?.find((product) => product.product_id?._id === record._id)
            ?.quantity?.toFixed(0) || 0,
      },
      { title: "Qutisi", dataIndex: "count_type", key: "count_type" },
      {
        title: "kimdan-kelgan",
        dataIndex: "kimdan_kelgan",
        key: "kimdan_kelgan",
      },
      {
        title: "Harakatlar",
        key: "actions",
        render: (_, record) => (
          <Button type="primary" onClick={() => handleSelectProduct(record)}>
            Tanlash
          </Button>
        ),
      },
    ],
    [currency, storeProducts, convertPrice, handleSelectProduct]
  );

  const selectedProductsColumns = useMemo(
    () => [
      {
        title: "Mahsulot nomi",
        dataIndex: "product_name",
        key: "product_name",
      },
      {
        title: (
          <span>
            Narxi{" "}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: 100 }}
            >
              <option value="sum">So'm</option>
              <option value="usd">USD</option>
            </select>
          </span>
        ),
        key: "sell_price",
        render: (_, record) => {
          const price = convertPrice(
            record.sell_price,
            record.currency,
            currency
          );
          return (
            <input
              type="number"
              value={parseFloat(price.toFixed(2))}
              onChange={(e) =>
                handleSellPriceChange(record._id, e.target.value)
              }
              style={{ width: "100px" }}
            />
          );
        },
      },
      { title: "Miqdori", dataIndex: "quantity", key: "quantity" },
      {
        title: "Soni",
        key: "quantity",
        render: (_, record) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              onClick={() => handleQuantityChange(record._id, -1)}
              disabled={
                record.quantity <=
                (["litr", "sm"].includes(record.count_type) ? 0.1 : 1)
              }
            >
              -
            </Button>
            {["litr", "sm"].includes(record.count_type) ? (
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={record.quantity}
                onChange={(e) =>
                  handleQuantityInputChange(record._id, e.target.value)
                }
                style={{ width: 60 }}
              />
            ) : (
              <span>{record.quantity}</span>
            )}
            <Button onClick={() => handleQuantityChange(record._id, 1)}>
              +
            </Button>
          </div>
        ),
      },
      {
        title: "Harakatlar",
        key: "actions",
        render: (_, record) => (
          <Button
            type="primary"
            danger
            onClick={() => handleRemoveProduct(record._id)}
          >
            O'chirish
          </Button>
        ),
      },
    ],
    [
      currency,
      convertPrice,
      handleSellPriceChange,
      handleQuantityChange,
      handleQuantityInputChange,
      handleRemoveProduct,
    ]
  );

  return (
    <div className="kassa-container">
      <Modal
        open={chekModal}
        style={{ display: "flex", justifyContent: "center" }}
        onCancel={() => {
          setChekModal(false);
          setSelectedProducts([]);
        }}
        footer={[
          <Button key="print" type="primary" onClick={handlePrint}>
            Chop etish
          </Button>,
        ]}
        title="To'lov cheki"
      >
        <div ref={receiptRef} style={{ width: "80mm", padding: 10 }}>
          <h1>ARZON QURULISH MOLLARI</h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "10px",
              marginBottom: "5px 0",
              marginTop: "8px",
            }}
          >
            +998997870205 | +998883711994
          </p>
          <p
            id="tgqr_p"
            style={{ display: "flex", justifyContent: "space-around" }}
          ></p>
          <p>Sana: {moment().tz("Asia/Tashkent").format("DD.MM.YYYY HH:mm")}</p>
          <table style={{ width: "100%", fontSize: "12px" }}>
            <thead style={{ border: "0px solid #000" }}>
              <tr style={{ border: "0px solid #000" }}>
                <th style={{ border: "0px solid #000" }}>Mahsulot</th>
                <th style={{ border: "0px solid #000" }}>Soni</th>
                <th style={{ border: "0px solid #000" }}>Narx</th>
                <th style={{ border: "0px solid #000" }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts?.map((item, index) => (
                <tr key={index}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {item.sell_price} {item.currency.toUpperCase()}
                  </td>
                  <td>{item.sell_price * item.quantity}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ border: "none" }}></td>
                <td>
                  <h1>Jami:</h1>
                  {Number(totalAmount.toFixed(2)).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        title="Qarzdorlar"
        open={qarzdorModalVisible}
        onCancel={() => setQarzdorModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Qarzdor />
      </Modal>

      <Modal
        title="Xarajatlar"
        open={xarajatlarModalVisible}
        onCancel={() => setXarajatlarModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Xarajatlar />
      </Modal>

      <Modal
        title="Vazvrat tavarlar"
        open={vazvratModalVisible}
        onCancel={() => setVazvratModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Vazvrat />
      </Modal>

      <Modal
        title="Sotuv Tarixi"
        open={sotuvtarixiModalVisible}
        onCancel={() => setSotuvtarixiModalVisible(false)}
        footer={null}
        width="90%"
      >
        <SotuvTarix />
      </Modal>

      <MastersModal
        visible={masterModal}
        onClose={() => setMasterModal(false)}
      />
      <ChekModal
        visible={chekBolimModal}
        onClose={() => setChekBolimModal(false)}
      />

      <Modal
        title="Tovarni nasiyaga berish"
        open={nasiyaModal}
        footer={[]}
        onCancel={() => setNasiyaModal(false)}
      >
        <form className="modal_form" onSubmit={handleNasiyaSubmit}>
          <p>Nasiyaga oluvchi ismi</p>
          <input placeholder="Ism" required type="text" name="name" />
          <select required name="location">
            <option value="skalad">Skalad</option>
            <option value="dokon">Do'kon</option>
          </select>
          <Button type="primary" htmlType="submit">
            Nasiyaga berish
          </Button>
        </form>
      </Modal>

      <Modal
        width={"900px"}
        title="Nasiyalar"
        open={nasiyaModalVisible}
        footer={null}
        onCancel={() => {
          setNasiyaModalVisible(false);
          setSellPrice("");
          setNasiyaPaymentMethod("naqd");
        }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Tovar</th>
              <th>Soni</th>
              <th>Sotish narx</th>
              <th>Model</th>
              <th>Nasiyaga oluvchi</th>
              <th>Sana</th>
              <th>Nasiyani yopish</th>
            </tr>
          </thead>
          <tbody>
            {nasiya
              .filter((n) => n.status === "active")
              .map((item) => (
                <tr key={item._id}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {products
                      ?.find((p) => p._id === item.product_id)
                      ?.sell_price.toLocaleString()}
                  </td>
                  <td>
                    {products?.find((p) => p._id === item.product_id)?.model}
                  </td>
                  <td>{item.nasiya_name}</td>
                  <td>{moment(item.createdAt).format("DD.MM.YYYY HH:mm")}</td>
                  <td>
                    <Popconfirm
                      title={
                        <div className="modal_form">
                          <p>Sotish narxi:</p>
                          <input
                            type="number"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(e.target.value)}
                          />
                          <p>To'lov usuli:</p>
                          <select
                            style={{ width: "100%" }}
                            value={nasiyaPaymentMethod}
                            onChange={(e) =>
                              setNasiyaPaymentMethod(e.target.value)
                            }
                          >
                            <option value="naqd">Naqd</option>
                            <option value="plastik">Karta</option>
                          </select>
                        </div>
                      }
                      onConfirm={() => handleCompleteNasiya(item)}
                      okText="Yopish"
                      cancelText="Bekor qilish"
                    >
                      <Button type="primary" style={{ margin: "4px 0" }}>
                        Yopish
                      </Button>
                    </Popconfirm>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Modal>

      <div className="kassa-header">
        <Button
          type="primary"
          onClick={() => setQarzdorModalVisible(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Qarzdorlar
        </Button>
        <Button
          type="primary"
          onClick={() => setXarajatlarModalVisible(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Xarajatlar
        </Button>
        <Button
          type="primary"
          onClick={() => setVazvratModalVisible(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Vazvrat tavarlar
        </Button>
        <Button
          type="primary"
          onClick={() => setSotuvtarixiModalVisible(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Sotuv Tarixi
        </Button>
        <Button
          type="primary"
          onClick={() => setMasterModal(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Ustalar
        </Button>
        <Button
          type="primary"
          onClick={() => setChekBolimModal(true)}
          style={{ marginRight: 10, width: "95%", height: "50px" }}
        >
          Cheklar
        </Button>
      </div>

      <Card
        title="Kassa"
        bordered={false}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column-reverse",
          alignItems: "stretch",
          backgroundColor: "#0F4C81",
          height: "100%",
          color: "white",
          borderRadius: 0.1,
          overflow: "auto",
        }}
        id="kassa"
      >
        <Input
          ref={searchInputRef}
          placeholder="shtrix kodi yoki katalog kiriting..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleScanBarcode(e.currentTarget.value);
            }
          }}
          style={{ marginBottom: 20, width: "40%" }}
          size="large"
        />

        {searchTerm && filteredProducts.length > 0 && (
          <Table
            dataSource={filteredProducts}
            loading={isLoading}
            style={{ width: "100%" }}
            columns={productColumns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        )}

        {searchTerm && filteredProducts.length === 0 && !isLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "white",
              fontStyle: "italic",
            }}
          >
            Hech qanday mahsulot topilmadi
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "end",
              justifyContent: "center",
            }}
          >
            <h2>Tanlangan mahsulotlar:</h2>
            <Table
              dataSource={selectedProducts}
              style={{ width: "100%" }}
              columns={selectedProductsColumns}
              rowKey="_id"
              pagination={false}
            />
            <div style={{ marginTop: 20, fontSize: "1.5em" }}>
              <strong>Umumiy summa: </strong>
              {currency === "usd"
                ? `${Number(totalAmount.toFixed(2)).toLocaleString()} USD`
                : `${Number(totalAmount.toFixed(2)).toLocaleString()} So'm`}
            </div>
            <Button
              type="primary"
              onClick={showModal}
              style={{ marginTop: 20 }}
            >
              Sotish
            </Button>
          </div>
        )}

        <Modal
          title="To'lov usulini tanlang"
          visible={isModalVisible}
          onOk={handleSellProducts}
          onCancel={handleCancel}
        >
          <Form layout="vertical">
            <Form.Item label="To'lov usuli">
              <Select
                value={paymentMethod}
                onChange={(value) => setPaymentMethod(value)}
                style={{ width: "100%" }}
              >
                <Option value="naqd">Naqd</Option>
                <Option value="plastik">Karta</Option>
                <Option value="qarz">Qarz</Option>
                <Option value="master">Ustaga</Option>
              </Select>
            </Form.Item>

            {paymentMethod === "qarz" && (
              <>
                <Form.Item label="Qarz oluvchi">
                  <Select
                    showSearch
                    placeholder="Qarzdorni tanlang"
                    optionFilterProp="children"
                    value={selectedDebtor}
                    onChange={(value) => {
                      if (value === "new") {
                        setDebtorName("");
                        setDebtorPhone("");
                        setSelectedDebtor(null);
                      } else {
                        setSelectedDebtor(value);
                      }
                    }}
                    filterOption={(input, option) => {
                      const debtor = debtors.find(
                        (d) => d._id === option?.value
                      );
                      if (!debtor) return false;
                      return (
                        debtor.name
                          .toLowerCase()
                          .includes(input.toLowerCase()) ||
                        debtor.phone.toLowerCase().includes(input.toLowerCase())
                      );
                    }}
                    style={{ width: "100%" }}
                  >
                    <Option value="new">➕ Yangi xaridor</Option>
                    {debtors.map((item) => (
                      <Option key={item._id} value={item._id}>
                        {item.name} - {item.phone}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {!selectedDebtor && (
                  <>
                    <Form.Item label="Yangi xaridor ismi">
                      <AntdInput
                        value={debtorName}
                        onChange={(e) => setDebtorName(e.target.value)}
                      />
                    </Form.Item>
                    <Form.Item label="Telefon raqami">
                      <AntdInput
                        value={debtorPhone}
                        onChange={(e) => setDebtorPhone(e.target.value)}
                      />
                    </Form.Item>
                  </>
                )}

                <Form.Item label="Qarz muddatini kiriting">
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                  />
                </Form.Item>
              </>
            )}

            {paymentMethod === "master" && (
              <>
                <Form.Item label="Ustani tanlang">
                  <Select
                    value={selectedMasterId}
                    onChange={(value) => {
                      setSelectedMasterId(value);
                      if (value === "new") {
                        setNewMasterName("");
                        setSelectedCarName("new");
                      }
                    }}
                    style={{ width: "100%" }}
                  >
                    <Option value="new">➕ Yangi usta</Option>
                    {masters?.map((m) => (
                      <Option key={m._id} value={m._id}>
                        {m.master_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {selectedMasterId === "new" && (
                  <Form.Item label="Yangi ustaning ismi">
                    <AntdInput
                      value={newMasterName}
                      onChange={(e) => setNewMasterName(e.target.value)}
                    />
                  </Form.Item>
                )}

                {selectedMasterId && selectedMasterId !== "new" && (
                  <Form.Item label="Mashinasini tanlang">
                    <Select
                      value={selectedCarName}
                      onChange={(value) => {
                        setSelectedCarName(value);
                        if (value === "new") {
                          setNewCarName("");
                        }
                      }}
                      style={{ width: "100%" }}
                    >
                      <Option value="new">➕ Yangi mashina</Option>
                      {masters
                        ?.find((m) => m._id === selectedMasterId)
                        ?.cars?.map((car, index) => (
                          <Option key={index} value={car.car_name}>
                            {car.car_name}
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                )}

                {selectedCarName === "new" && (
                  <Form.Item label="Yangi mashina nomi">
                    <AntdInput
                      value={newCarName}
                      onChange={(e) => setNewCarName(e.target.value)}
                    />
                  </Form.Item>
                )}
              </>
            )}
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
