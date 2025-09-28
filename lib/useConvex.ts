import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// User queries
export const useGetAllUsers = () => useQuery(api.users.getAllUsers);
export const useGetUserByEmail = (email: string) =>
  useQuery(api.users.getUserByEmail, { email });
export const useGetUserByWorkosId = (workosUserId: string) =>
  useQuery(api.users.getUserByWorkosId, { workosUserId });
export const useGetUsersByOrganization = (organizationId: string) =>
  useQuery(api.users.getUsersByOrganization, { organizationId });

// User mutations
export const useCreateUser = () => useMutation(api.users.createUser);
export const useUpdateUser = () => useMutation(api.users.updateUser);
export const useDeactivateUser = () => useMutation(api.users.deactivateUser);