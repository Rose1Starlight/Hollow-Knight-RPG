/**
 * EquipmentSheet - Item sheet for general equipment and tools
 */
export class EquipmentSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "item", "equipment"],
      template: "systems/hollow-knight-rpg/templates/items/equipment-sheet.hbs",
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