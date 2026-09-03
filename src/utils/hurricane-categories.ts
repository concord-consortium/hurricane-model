import commonCss from "../components/common.scss";

export const categoryColors: string[] = [
  commonCss.cat0Color, commonCss.cat1Color, commonCss.cat2Color,
  commonCss.cat3Color, commonCss.cat4Color, commonCss.cat5Color
];

export function categoryLabel(category: number): string {
  return category === 0 ? "TS" : `Cat ${category}`;
}
