import { apiSlice } from "./api.service";

// `debtorApi` xizmatini yaratamiz va endpointlarni qo'shamiz
export const debtorApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Qarzdor yaratish
    createDebtor: builder.mutation({
      query: (debtor) => ({
        url: "/debtors",
        method: "POST",
        body: debtor,
      }),
      invalidatesTags: ["Debtor", "Sales", "DebtorPayments"],
    }),

    // Mahsulotni qaytarish
    returnProductDebtor: builder.mutation({
      query: (body) => ({
        url: "/debtors/return",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Debtor", "Sales", "Store"],
    }),

    // Barcha qarzdorlarni olish
    getDebtors: builder.query({
      query: () => ({
        url: "/debtors",
        method: "GET",
      }),
      providesTags: ["Debtor", "Sales"],
    }),

    // Qarzdorni yangilash (to'lov qilish)
    updateDebtor: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/debtors/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Debtor", "Sales", "DebtorPayments"],
    }),

    // Qarzdor ma'lumotlarini tahrirlash
    editDebtor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/debtor/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Debtor", "Sales"],
    }),

    // Qarzdor to'lovi yaratish
    createPayment: builder.mutation({
      query: (body) => ({
        url: `/pay/debtor`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Debtor", "Sales", "DebtorPayments", "Store"],
    }),

    // Qarzdor to'lovlari ro'yxatini olish (YANGI)
    getDebtorPayments: builder.query({
      query: () => ({
        url: "/debtor/payments",
        method: "GET",
      }),
      providesTags: ["DebtorPayments", "Debtor"],
    }),

    // Qarzdorni o'chirish
    deleteDebtor: builder.mutation({
      query: (id) => ({
        url: `/debtors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Debtor", "Sales"],
    }),
  }),
});

// Export hooks
export const {
  useCreateDebtorMutation,
  useGetDebtorsQuery,
  useUpdateDebtorMutation,
  useDeleteDebtorMutation,
  useReturnProductDebtorMutation,
  useEditDebtorMutation,
  useCreatePaymentMutation,
  useGetDebtorPaymentsQuery, // YANGI hook
} = debtorApi;
