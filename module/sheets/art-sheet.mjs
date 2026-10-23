/**
 * ArtSheet - Item sheet for Weapon Arts
 */
export class ArtSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "art"],
      template: "systems/hollow-knight-rpg/templates/items/art-sheet.hbs",
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