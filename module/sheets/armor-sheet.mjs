/**
 * ArmorSheet - Item sheet for armor and shields
 */
export class ArmorSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "armor"],
      template: "systems/hollow-knight-rpg/templates/items/armor-sheet.hbs",
      width: 560,
      height: 480
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.item.system;
    return context;
  }
}