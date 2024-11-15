import { ApiId } from "@/api/types";
import { createApi } from "@/api/utils/create-api";
import { useQuery } from "react-query";

interface IGroup {
  id: ApiId;
  name: string;
}

export const useGroup = (id: ApiId) => {
  const api = createApi();

  return useQuery<IGroup>(["group", id], async () => {
    const { data } = await api.get(`/groups/${id}`);
    return data;
  });
};
