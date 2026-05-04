import { Heart, GitCompare } from "lucide-react";
import { useCatalogUI } from "@/store/catalog-ui-store";

type Props = {
  productId: string;
};

export function ProductActions({ productId }: Props) {
  const toggleFavorite = useCatalogUI((s) => s.toggleFavorite);
  const toggleCompare = useCatalogUI((s) => s.toggleCompare);
  const isFavorite = useCatalogUI((s) => s.isFavorite);
  const isInCompare = useCatalogUI((s) => s.isInCompare);

  const fav = isFavorite(productId);
  const cmp = isInCompare(productId);

  return (
    <div className="flex items-center gap-2">
      {/* FAVORITE */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(productId);
        }}
        className={`
          p-2 rounded-lg transition-all duration-200
          flex items-center justify-center
          ${fav
            ? "bg-red-500 text-white shadow-md scale-105"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"}
        `}
        title={fav ? "Убрать из избранного" : "Добавить в избранное"}
      >
        <Heart
          size={16}
          className={`transition ${fav ? "fill-white" : ""}`}
        />
      </button>

      {/* COMPARE */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCompare(productId);
        }}
        className={`
          p-2 rounded-lg transition-all duration-200
          flex items-center justify-center
          ${cmp
            ? "bg-blue-500 text-white shadow-md scale-105"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"}
        `}
        title={cmp ? "Убрать из сравнения" : "Добавить в сравнение"}
      >
        <GitCompare size={16} />
      </button>
    </div>
  );
}