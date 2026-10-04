import { useRouter } from "expo-router";
import { portfolioHref } from "@/navigation/detailRoutes";
import { NewPortfolioSheet } from "@/features/portfolio/NewPortfolioSheet";
import { SheetRoute } from "@/navigation/sheetRoute";

export default function NewPortfolio() {
  const router = useRouter();
  return (
    <>
      <SheetRoute />
      <NewPortfolioSheet
        onClose={() => router.back()}
        onCreated={(id) => router.push(portfolioHref("(home)", id))}
      />
    </>
  );
}
