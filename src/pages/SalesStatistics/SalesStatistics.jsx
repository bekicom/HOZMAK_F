import React, { useState } from "react";
import { useCompareStockLevelsQuery } from "../../context/service/SalesStatistics.service";
import { useGetSalesStatsQuery } from "../../context/service/sale.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";
import { Select } from "antd";
import { useGetStoreProductsQuery } from "../../context/service/store.service";

export default function SalesStatistics() {
  const { data: stats = [] } = useGetSalesStatsQuery();
  const {
    data: storeProducts,
    isLoading: storeLoading,
    refetch: refetchStoreProducts,
  } = useGetStoreProductsQuery();

  const currentMonth = moment().format("YYYY-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: stockComparison, isLoading: stockLoading } =
    useCompareStockLevelsQuery();

  const renderTooltip = (props) => {
    const { payload } = props;
    if (payload && payload.length > 0) {
      const { product_name, product_id, sold_quantity } = payload[0].payload;
      return (
        <div
          style={{ background: "#fff", color: "#000", padding: "20px" }}
          className="custom-tooltip"
        >
          <p>
            <strong>Mahsulot:</strong> {product_name}
          </p>
          <p>
            <strong>Brend:</strong>{" "}
            {
              storeProducts.find((p) => p.product_id._id === product_id)
                ?.product_id.brand_name
            }
          </p>
          <p>
            <strong>Model:</strong>{" "}
            {
              storeProducts.find((p) => p.product_id._id === product_id)
                ?.product_id.model
            }{" "}
          </p>
          <p>
            <strong>Sotilgan soni:</strong> {sold_quantity}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {stats.length > 0 && (
        <Select
          defaultValue={selectedMonth}
          onChange={(value) => setSelectedMonth(value)}
        >
          {stats.map((st) => (
            <Select.Option key={st.date} value={st.date}>
              {st.date}
            </Select.Option>
          ))}
        </Select>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={stats.find((st) => st.date === selectedMonth)?.products || []}
        >
          <XAxis dataKey="product_name" />
          <YAxis />
          <Tooltip content={renderTooltip} />
          <Bar dataKey="sold_quantity" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
