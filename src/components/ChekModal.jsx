import { Button, Modal, Table } from "antd";
import { useGetSalesHistoryQuery } from "../context/service/sale.service";
import { useMemo, useRef } from "react";
import moment from "moment-timezone";
import { FaPrint } from "react-icons/fa";
import { useReactToPrint } from "react-to-print";
import logo from "../assets/logo.png";

const ChekModal = ({ visible, onClose }) => {
  const { data: sales = [] } = useGetSalesHistoryQuery();
  const receiptRef = useRef();

  const groupedSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const sorted = [...sales].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const result = [];
    let currentGroup = null;

    for (let sale of sorted) {
      if (!currentGroup) {
        currentGroup = {
          createdAt: sale.createdAt,
          products: [],
          debtor_name: sale.debtor_name || null,
          debtor_phone: sale.debtor_phone || null,
          debt_due_date: sale.debt_due_date || null,
          payment_method: sale.payment_method,
        };
      }

      const diffSeconds =
        (new Date(sale.createdAt) - new Date(currentGroup.createdAt)) / 1000;

      if (diffSeconds <= 10) {
        currentGroup.products.push({
          product_name: sale.product_name,
          sell_price: sale.sell_price,
          quantity: sale.quantity,
          total_price: sale.total_price,
          currency: sale.currency,
        });

        if (!currentGroup.debtor_name && sale.debtor_name)
          currentGroup.debtor_name = sale.debtor_name;
        if (!currentGroup.debtor_phone && sale.debtor_phone)
          currentGroup.debtor_phone = sale.debtor_phone;
        if (!currentGroup.debt_due_date && sale.debt_due_date)
          currentGroup.debt_due_date = sale.debt_due_date;
      } else {
        result.push(currentGroup);
        currentGroup = {
          createdAt: sale.createdAt,
          products: [
            {
              product_name: sale.product_name,
              sell_price: sale.sell_price,
              quantity: sale.quantity,
              total_price: sale.total_price,
              currency: sale.currency,
            },
          ],
          debtor_name: sale.debtor_name || null,
          debtor_phone: sale.debtor_phone || null,
          debt_due_date: sale.debt_due_date || null,
          payment_method: sale.payment_method,
        };
      }
    }

    if (currentGroup) {
      result.push(currentGroup);
    }

    return result;
  }, [sales]);

  const handlePrintReceipt = (record) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");

    const totalAmount = record.products.reduce(
      (sum, p) => sum + p.sell_price * p.quantity,
      0
    );

    printWindow.document.write(`
    <html>
      <head>
        <title>Chek</title>
        <style>
          body { font-family: sans-serif; width: 80mm; padding: 10px;display: flex; flex-direction:column; gap:10px }
          table { width: 100%; font-size: 12px; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; }
          h4 { margin: 5px 0; }
          img { display: block; margin: 0 auto; }
          p { margin: 3px 0; }
        </style>
      </head>
      <body>
        <img src="${logo}" alt="" width="150" />
        <p style="text-align: center; font-size: 10px; margin-top: 8px;">
          +998 91 294 87 80 | +998 90 790 42 32
        </p>
        <p>Sana: ${moment(record.createdAt)
          .tz("Asia/Tashkent")
          .format("DD.MM.YYYY HH:mm")}</p>
        <table>
          <thead>
            <tr>
              <th>Mahsulot</th>
              <th>Soni</th>
              <th>Narx</th>
              <th>Jami</th>
            </tr>
          </thead>
          <tbody>
            ${record.products
              .map(
                (item) => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.sell_price} ${item.currency.toUpperCase()}</td>
                <td>${item.sell_price * item.quantity}</td>
              </tr>
            `
              )
              .join("")}
            <tr>
              <td colspan="3"></td>
              <td>
                <h4>Jami:</h4>
                ${Number(totalAmount.toFixed(2)).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `);

    printWindow.document.close();

    // Yangi oynada rasm yuklangandan keyin print chaqirish
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      render: (text) => moment(text).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "To'lov usuli",
      dataIndex: "payment_method",
    },
    {
      title: "Chop etish",
      render: (_, record) => (
        <Button
          icon={<FaPrint />}
          onClick={() => {
            handlePrintReceipt(record);
          }}
        />
      ),
    },
  ];

  // Tanlangan record saqlash
  const selectedRecord = useRef(null);

  return (
    <>
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={900}
        title="Cheklar ro'yhati"
      >
        <Table
          columns={columns}
          dataSource={groupedSales.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )}
          rowKey={(record, index) => index}
          size="small"
        />
      </Modal>

      <div style={{ display: "none" }}>
        {selectedRecord.current && (
          <div
            ref={receiptRef}
            style={{ width: "80mm", padding: 10, fontFamily: "sans-serif" }}
          >
            <img
              src={logo}
              alt=""
              width={150}
              style={{ display: "block", margin: "0 auto" }}
            />
            <p
              style={{
                textAlign: "center",
                fontSize: "10px",
                marginBottom: "5px",
                marginTop: "8px",
              }}
            >
              +998 91 294 87 80 | +998 90 790 42 32
            </p>
            <p>
              Sana:{" "}
              {moment(selectedRecord.current.createdAt)
                .tz("Asia/Tashkent")
                .format("DD.MM.YYYY HH:mm")}
            </p>
            <table style={{ width: "100%", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Soni</th>
                  <th>Narx</th>
                  <th>Jami</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecord.current?.products.map((item, index) => (
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
                    <h4>Jami:</h4>
                    {Number(
                      selectedRecord.current.products
                        .reduce((sum, p) => sum + p.sell_price * p.quantity, 0)
                        .toFixed(2)
                    ).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ChekModal;
