import { apiSlice } from "./api.service";

export const clientApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ==== GET ALL CLIENTS ====
    getClients: builder.query({
      query: () => ({
        url: "/clients",
        method: "GET",
      }),
      providesTags: ["Clients"],
    }),

    // ==== GET CLIENT BY ID ====
    getClientById: builder.query({
      query: (id) => ({
        url: `/clients/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Clients", id }],
    }),

    // ==== CREATE CLIENT ====
    createClient: builder.mutation({
      query: (clientData) => ({
        url: "/clients",
        method: "POST",
        body: clientData,
      }),
      invalidatesTags: ["Clients"],
    }),

    // ==== UPDATE CLIENT ====
    updateClient: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/clients/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Clients",
        { type: "Clients", id },
      ],
    }),

    // ==== DELETE CLIENT ====
    deleteClient: builder.mutation({
      query: (id) => ({
        url: `/clients/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Clients"],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientApi;
