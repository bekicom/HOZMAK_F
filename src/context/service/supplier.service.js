import { apiSlice } from "./api.service";

export const supplierApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: () => ({
        url: "/suppliers",
        method: "GET",
      }),
      providesTags: ["Supplier"],
    }),

    getSupplierById: builder.query({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "GET",
      }),
      providesTags: ["Supplier"],
    }),

    createSupplier: builder.mutation({
      query: (supplier) => ({
        url: "/suppliers",
        method: "POST",
        body: supplier,
      }),
      invalidatesTags: ["Supplier"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: ["Supplier"],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = supplierApi;
