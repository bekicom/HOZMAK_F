import { apiSlice } from "./api.service";

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ProductReceipt endpoints
    createProductReceipt: builder.mutation({
      query: (receipt) => ({
        url: "/product-receipts",
        method: "POST",
        body: receipt,
      }),
      invalidatesTags: ["ProductReceipt", "Product", "Store"],
    }),

    getProductReceipts: builder.query({
      query: () => ({
        url: "/product-receipts",
        method: "GET",
      }),
      providesTags: ["ProductReceipt"],
    }),

    payToSupplier: builder.mutation({
      query: (payment) => ({
        url: "/supplier-payment",
        method: "POST",
        body: payment,
      }),
      invalidatesTags: ["ProductReceipt"],
    }),

    getProductsBySupplier: builder.query({
      query: (supplier_id) => ({
        url: `/products/supplier/${supplier_id}`,
        method: "GET",
      }),
      providesTags: ["Product"],
    }),

    getDebtorSuppliers: builder.query({
      query: () => ({
        url: "/debtor-suppliers",
        method: "GET",
      }),
      providesTags: ["ProductReceipt"],
    }),
  }),
});

export const {
  useCreateProductReceiptMutation,
  useGetProductReceiptsQuery,
  usePayToSupplierMutation,
  useGetProductsBySupplierQuery,
  useGetDebtorSuppliersQuery,
} = productApi;
