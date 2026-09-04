import { log } from "../log";
import { UIModel } from "../models/ui";

export function changeWindArrows(ui: UIModel, checked: boolean) {
  ui.setWindArrows(checked);
  log(checked ? "WindArrowsShown" : "WindArrowsHidden");
}

export function changeHurricaneImage(ui: UIModel, checked: boolean) {
  ui.setHurricaneImage(checked);
  log(checked ? "HurricaneImageShown" : "HurricaneImageHidden");
}
