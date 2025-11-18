import { useState, useEffect, useMemo } from "react";
import {
  Table,
  Card,
  DatePicker,
  Select,
  Statistic,
  Row,
  Col,
  Button,
  Tag,
} from "antd";
import {
  useGetSalesHistoryQuery,
  useDeleteSaleMutation,
} from "../../context/service/sale.service";
import {
  useGetDebtorsQuery,
  useGetDebtorPaymentsQuery,
} from "../../context/service/debtor.service";
import { useGetUsdRateQuery } from "../../context/service/usd.service";
import { Popconfirm } from "antd";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function SotuvTarix() {
  const { data: sales, isLoading } = useGetSalesHistoryQuery();
  const { data: debtors = [] } = useGetDebtorsQuery();
  const { data: debtorPayments = [], isLoading: paymentsLoading } =
    useGetDebtorPaymentsQuery();

  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState([null, null]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState("");
  const [deleteSale, { isLoading: isDeleting }] = useDeleteSaleMutation();
  const [filteredPayments, setFilteredPayments] = useState([]);

  const { data: usdRate, isLoading: usdLoading } = useGetUsdRateQuery();
  const USD_RATE = usdRate?.rate || 12850;

  const onDateChange = (dates) => {
    setSelectedDateRange(dates);
    filterSales(dates, paymentMethod, currency);
  };

  const onPaymentMethodChange = (value) => {
    setPaymentMethod(value);
    filterSales(selectedDateRange, value, currency);
  };

  const onCurrencyChange = (value) => {
    setCurrency(value);
    filterSales(selectedDateRange, paymentMethod, value);
  };

  // ✅ FILTER: Faqat haqiqiy sotuvlarni ko'rsatish, qarzdor to'lovlarini OLIB TASHLASH
  const filterSales = (dates, payment, currency) => {
    let filtered = sales || [];

    // ❌ Qarzdor to'lovlarini BUTUNLAY olib tashlash
    filtered = filtered.filter((sale) => {
      return sale.payment_method !== "qarzdor_tolovi";
    });

    // Qolgan filterlar
    if (dates && dates[0] && dates[1]) {
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= dates[0] && saleDate <= dates[1];
      });
    }
    if (payment) {
      filtered = filtered.filter((sale) => sale.payment_method === payment);
    }
    if (currency) {
      filtered = filtered.filter((f) => f.currency === currency);
    }
    setFilteredSales(filtered);

    // Qarzdor to'lovlarini alohida filter qilish
    let filteredDebtorPayments = debtorPayments || [];
    if (dates && dates[0] && dates[1]) {
      filteredDebtorPayments = filteredDebtorPayments.filter((payment) => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= dates[0] && paymentDate <= dates[1];
      });
    }
    if (currency) {
      filteredDebtorPayments = filteredDebtorPayments.filter(
        (p) => p.currency === currency
      );
    }
    setFilteredPayments(filteredDebtorPayments);
  };

  const handleDelete = async (id) => {
    try {
      await deleteSale(id).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const paymentSummary = useMemo(() => {
    const sum = filteredPayments
      .filter((p) => p.currency === "sum")
      .reduce((acc, cur) => acc + cur.amount, 0);
    const usd = filteredPayments
      .filter((p) => p.currency === "usd")
      .reduce((acc, cur) => acc + cur.amount, 0);
    return { sum, usd };
  }, [filteredPayments]);

  const paymentColumns = [
    {
      title: "Ism",
      dataIndex: "debtor_name",
      key: "debtor_name",
      width: 150,
    },
    {
      title: "Telefon",
      dataIndex: "debtor_phone",
      key: "debtor_phone",
      width: 150,
    },
    {
      title: "Miqdori",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (amount, record) => {
        const currency = record.currency || "sum";
        return (
          <strong>
            {Number(amount).toLocaleString("uz-UZ")}{" "}
            {currency === "usd" ? "$" : "so'm"}
          </strong>
        );
      },
    },
    {
      title: "So'mda",
      key: "amount_sum",
      width: 150,
      render: (_, record) => {
        const amount = Number(record.amount);
        const currency = record.currency || "sum";
        const amountInSum = currency === "usd" ? amount * USD_RATE : amount;
        return (
          <span style={{ color: "green" }}>
            {amountInSum.toLocaleString("uz-UZ")} so'm
          </span>
        );
      },
    },
    {
      title: "USD da",
      key: "amount_usd",
      width: 150,
      render: (_, record) => {
        const amount = Number(record.amount);
        const currency = record.currency || "sum";
        const amountInUsd = currency === "sum" ? amount / USD_RATE : amount;
        return (
          <span style={{ color: "blue" }}>
            {amountInUsd.toLocaleString("uz-UZ", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            $
          </span>
        );
      },
    },
    {
      title: "Valyuta",
      dataIndex: "currency",
      key: "currency",
      width: 100,
      render: (currency) => (
        <Tag color={currency === "usd" ? "green" : "blue"}>
          {currency === "usd" ? "USD" : "SO'M"}
        </Tag>
      ),
    },
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      width: 180,
      render: (date) => new Date(date).toLocaleString("uz-UZ"),
    },
  ];

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPrice = (price, currency) => {
    if (!price) return "0 so'm";
    const formatted = formatNumber(price);
    return `${formatted} ${currency === "sum" ? "so'm" : "$"}`;
  };

  // Foyda/Zarar hisoblash funksiyasi - faqat haqiqiy sotuvlar uchun
  const calculateProfitLoss = (sale) => {
    if (!sale.sell_price || !sale.buy_price) return 0;

    const quantity = sale.quantity || 1;

    const sellPrice = sale.sell_price * quantity;
    let buyPrice = sale.buy_price * quantity;

    const productCurrency = sale.product_id?.currency || sale.currency;

    if (productCurrency === "usd" && sale.currency === "sum") {
      buyPrice *= USD_RATE;
    } else if (productCurrency === "sum" && sale.currency === "usd") {
      buyPrice /= USD_RATE;
    }

    return sellPrice - buyPrice;
  };

  const calculateStats = (data, currency) => {
    // Faqat haqiqiy sotuvlarni hisoblaymiz
    const filteredByCurrency =
      data?.filter((item) => item.currency === currency) || [];

    const total = filteredByCurrency.reduce(
      (acc, sale) => acc + sale.total_price,
      0
    );

    const totalProfit = filteredByCurrency.reduce((acc, sale) => {
      return acc + calculateProfitLoss(sale);
    }, 0);

    const weekly = filteredByCurrency
      .filter(
        (sale) =>
          new Date(sale.createdAt) >=
          new Date(new Date().setDate(new Date().getDate() - 7))
      )
      .reduce((acc, sale) => acc + sale.total_price, 0);

    const weeklyProfit = filteredByCurrency
      .filter(
        (sale) =>
          new Date(sale.createdAt) >=
          new Date(new Date().setDate(new Date().getDate() - 7))
      )
      .reduce((acc, sale) => acc + calculateProfitLoss(sale), 0);

    const daily = filteredByCurrency
      .filter(
        (sale) =>
          new Date(sale.createdAt).toLocaleDateString() ===
          new Date().toLocaleDateString()
      )
      .reduce((acc, sale) => acc + sale.total_price, 0);

    const dailyProfit = filteredByCurrency
      .filter(
        (sale) =>
          new Date(sale.createdAt).toLocaleDateString() ===
          new Date().toLocaleDateString()
      )
      .reduce((acc, sale) => acc + calculateProfitLoss(sale), 0);

    return {
      total,
      weekly,
      daily,
      totalProfit,
      weeklyProfit,
      dailyProfit,
    };
  };

  const sumStats = calculateStats(filteredSales, "sum");
  const usdStats = calculateStats(filteredSales, "usd");

  useEffect(() => {
    // Dastlabki filter: qarzdor to'lovlarini olib tashlash
    const initialFilteredSales = (sales || []).filter(
      (sale) => sale.payment_method !== "qarzdor_tolovi"
    );
    setFilteredSales(initialFilteredSales);
    setFilteredPayments(debtorPayments || []);
  }, [sales, debtorPayments]);

  const showDailySales = () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    filterSales([startOfDay, endOfDay], paymentMethod, currency);
  };

  const columns = [
    {
      title: "Mahsulot",
      dataIndex: "product_name",
      key: "product_name",
    },
    {
      title: "Model",
      dataIndex: ["product_id", "model"],
      key: "model",
      render: (text, record) => record.product_id?.model || "-",
    },
    {
      title: "Valyuta",
      dataIndex: "currency",
      key: "currency",
      render: (currency) => (
        <Tag color={currency === "usd" ? "green" : "blue"}>
          {currency === "usd" ? "USD" : "SO'M"}
        </Tag>
      ),
    },
    {
      title: "Soni",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Tan narxi",
      dataIndex: "buy_price",
      key: "buy_price",
      render: (text, record) => {
        if (!text) return "-";
        const totalBuyPrice = text * (record.quantity || 1);
        return formatPrice(totalBuyPrice, record.currency);
      },
    },
    {
      title: "Sotuv narxi",
      dataIndex: "sell_price",
      key: "sell_price",
      render: (text, record) => {
        return formatPrice(text, record.currency);
      },
    },
    {
      title: "Umumiy narxi",
      dataIndex: "total_price",
      key: "total_price",
      render: (text, record) => formatPrice(text, record.currency),
    },
    {
      title: "Foyda/Zarar",
      key: "profit_loss",
      render: (text, record) => {
        const profitLoss = calculateProfitLoss(record);
        if (profitLoss === 0) {
          return "-";
        }
        const isProfit = profitLoss > 0;
        return (
          <span
            style={{
              color: isProfit ? "#52c41a" : "#ff4d4f",
              fontWeight: "bold",
            }}
          >
            {isProfit ? "+" : ""}
            {formatPrice(Math.abs(profitLoss), record.currency)}
          </span>
        );
      },
    },
    {
      title: "To'lov usuli",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => {
        const methodNames = {
          naqd: "Naqd",
          plastik: "Karta",
          qarz: "Qarz",
          master: "Ustaga",
        };
        return methodNames[method] || method;
      },
    },
    {
      title: "Sotilgan sana",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => new Date(text).toLocaleString("uz-UZ"),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (text, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Popconfirm
            title="Haqiqatan ham o'chirmoqchimisiz?"
            onConfirm={() => handleDelete(record._id)}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button
              type="link"
              danger
              loading={isDeleting}
              style={{ padding: 0 }}
            >
              O'chirish
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Sotuvlar tarixi"
      bordered={false}
      style={{ margin: 20, width: "100%" }}
    >
      <div style={{ marginBottom: 20 }}>
        <RangePicker onChange={onDateChange} style={{ marginRight: 20 }} />
        <Select
          placeholder="To'lov usulini tanlang"
          onChange={onPaymentMethodChange}
          style={{ width: 200, marginRight: 20 }}
        >
          <Option value="">Barchasi</Option>
          <Option value="naqd">Naqd</Option>
          <Option value="plastik">Karta</Option>
          <Option value="qarz">Qarz</Option>
          <Option value="master">Ustaga</Option>
          {/* Qarzdor to'lovi varianti OLIB TASHLANDI */}
        </Select>
        <Select
          placeholder="Valyutani tanlang"
          value={currency}
          onChange={onCurrencyChange}
          style={{ width: 200, marginRight: 20 }}
        >
          <Option value="">Barchasi</Option>
          <Option value="sum">So'm</Option>
          <Option value="usd">USD</Option>
        </Select>
        <Button type="primary" onClick={showDailySales}>
          Bir kunlik savdo
        </Button>
      </div>

      {/* Sotuvlar statistikasi - FAQAT HAQIQIY SOTUVLAR */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Statistic
            title="Umumiy summa (so'm)"
            value={formatPrice(sumStats.total, "sum")}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Haftalik summa (so'm)"
            value={formatPrice(sumStats.weekly, "sum")}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Kunlik summa (so'm)"
            value={formatPrice(sumStats.daily, "sum")}
          />
        </Col>
      </Row>

      {/* Foyda/Zarar statistikasi (So'm) - FAQAT HAQIQIY SOTUVLAR */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Statistic
            title="Umumiy foyda/zarar (so'm)"
            value={formatPrice(Math.abs(sumStats.totalProfit), "sum")}
            valueStyle={{
              color: sumStats.totalProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={sumStats.totalProfit >= 0 ? "+" : "-"}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Haftalik foyda/zarar (so'm)"
            value={formatPrice(Math.abs(sumStats.weeklyProfit), "sum")}
            valueStyle={{
              color: sumStats.weeklyProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={sumStats.weeklyProfit >= 0 ? "+" : "-"}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Kunlik foyda/zarar (so'm)"
            value={formatPrice(Math.abs(sumStats.dailyProfit), "sum")}
            valueStyle={{
              color: sumStats.dailyProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={sumStats.dailyProfit >= 0 ? "+" : "-"}
          />
        </Col>
      </Row>

      {/* USD statistikasi - FAQAT HAQIQIY SOTUVLAR */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Statistic
            title="Umumiy summa ($)"
            value={formatPrice(usdStats.total, "usd")}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Haftalik summa ($)"
            value={formatPrice(usdStats.weekly, "usd")}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Kunlik summa ($)"
            value={formatPrice(usdStats.daily, "usd")}
          />
        </Col>
      </Row>

      {/* USD Foyda/Zarar statistikasi - FAQAT HAQIQIY SOTUVLAR */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Statistic
            title="Umumiy foyda/zarar ($)"
            value={formatPrice(Math.abs(usdStats.totalProfit), "usd")}
            valueStyle={{
              color: usdStats.totalProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={usdStats.totalProfit >= 0 ? "+" : "-"}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Haftalik foyda/zarar ($)"
            value={formatPrice(Math.abs(usdStats.weeklyProfit), "usd")}
            valueStyle={{
              color: usdStats.weeklyProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={usdStats.weeklyProfit >= 0 ? "+" : "-"}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Kunlik foyda/zarar ($)"
            value={formatPrice(Math.abs(usdStats.dailyProfit), "usd")}
            valueStyle={{
              color: usdStats.dailyProfit >= 0 ? "#3f8600" : "#cf1322",
            }}
            prefix={usdStats.dailyProfit >= 0 ? "+" : "-"}
          />
        </Col>
      </Row>

      {/* Qarzdor to'lovlari statistikasi - ALOHIDA */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Statistic
            title="Qarzdor to'lovlari (so'm)"
            value={formatPrice(paymentSummary.sum, "sum")}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Qarzdor to'lovlari ($)"
            value={formatPrice(paymentSummary.usd, "usd")}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
      </Row>

      {/* Sotuvlar jadvali - FAQAT HAQIQIY SOTUVLAR */}
      <Table
        dataSource={filteredSales}
        loading={isLoading}
        style={{ width: "100%", marginBottom: 40 }}
        columns={columns}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
        title={() => <h3>📈 Haqiqiy sotuvlar ro'yxati</h3>}
      />

      {/* Qarzdor to'lovlari jadvali - ALOHIDA */}
      <Card
        title="💰 Qarzdor to'lovlari ro'yxati"
        style={{ marginTop: 20 }}
        bordered={false}
      >
        <Table
          dataSource={filteredPayments}
          columns={paymentColumns}
          loading={paymentsLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Card>
  );
}
