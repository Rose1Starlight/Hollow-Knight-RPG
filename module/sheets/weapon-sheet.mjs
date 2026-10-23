/**
 * WeaponSheet - Item sheet for weapons
 */
export class WeaponSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "weapon"],
      template: "systems/hollow-knight-rpg/templates/items/weapon-sheet.hbs",
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