import { useRouter } from "expo-router";
import { NewPortfolioSheet } from "@/features/portfolio/NewPortfolioSheet";
import { SheetRoute } from "@/features/portfolio/routeOptions";

export default function NewPortfolio() {
  const router = useRouter();
  return (
    <>
      <SheetRoute />
      <NewPortfolioSheet
        onClose={() => router.back()}
        onCreated={(id) => router.push({ pathname: "/portfolio/[id]", params: { id } })}
      />
    </>
  );
}
