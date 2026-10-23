/**
 * CharmSheet - Item sheet for charms
 */
export class CharmSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "charm"],
      template: "systems/hollow-knight-rpg/templates/items/charm-sheet.hbs",
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