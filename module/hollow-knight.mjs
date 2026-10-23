/**
 * The Unofficial Hollow Knight RPG - Foundry VTT System
 * Main Module Entry Point
 */

import { HollowKnightActor } from "./documents/actor.mjs";
import { HollowKnightItem } from "./documents/item.mjs";
import { BugSheet } from "./sheets/bug-sheet.mjs";
import { NpcSheet } from "./sheets/npc-sheet.mjs";
import { CreatureSheet } from "./sheets/creature-sheet.mjs";
import { WeaponSheet } from "./sheets/weapon-sheet.mjs";
import { ArmorSheet } from "./sheets/armor-sheet.mjs";
import { CharmSheet } from "./sheets/charm-sheet.mjs";
import { ArtSheet } from "./sheets/art-sheet.mjs";
import { ArcanaSheet } from "./sheets/arcana-sheet.mjs";
import { TraitSheet } from "./sheets/trait-sheet.mjs";
import { PathSheet } from "./sheets/path-sheet.mjs";
import { ConsumableSheet } from "./sheets/consumable-sheet.mjs";
import { EquipmentSheet } from "./sheets/equipment-sheet.mjs";

import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerSystemSettings } from "./settings.mjs";
import { HollowKnightRolls } from "./rolls/rolls.mjs";

Hooks.once("init", async function() {
  CONFIG.Actor.documentClass = HollowKnightActor;
  CONFIG.Item.documentClass = HollowKnightItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("hollow-knight-rpg", BugSheet, { types: ["bug"], makeDefault: true, label: "Bug Sheet" });
  Actors.registerSheet("hollow-knight-rpg", NpcSheet, { types: ["npc"], makeDefault: true, label: "NPC Sheet" });
  Actors.registerSheet("hollow-knight-rpg", CreatureSheet, { types: ["creature"], makeDefault: true, label: "Creature Sheet" });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("hollow-knight-rpg", WeaponSheet, { types: ["weapon"], makeDefault: true, label: "Weapon Sheet" });
  Items.registerSheet("hollow-knight-rpg", ArmorSheet, { types: ["armor", "shield"], makeDefault: true, label: "Armor Sheet" });
  Items.registerSheet("hollow-knight-rpg", CharmSheet, { types: ["charm"], makeDefault: true, label: "Charm Sheet" });
  Items.registerSheet("hollow-knight-rpg", ArtSheet, { types: ["art"], makeDefault: true, label: "Art Sheet" });
  Items.registerSheet("hollow-knight-rpg", ArcanaSheet, { types: ["arcana"], makeDefault: true, label: "Arcana Sheet" });
  Items.registerSheet("hollow-knight-rpg", TraitSheet, { types: ["trait"], makeDefault: true, label: "Trait Sheet" });
  Items.registerSheet("hollow-knight-rpg", PathSheet, { types: ["path"], makeDefault: true, label: "Path Sheet" });
  Items.registerSheet("hollow-knight-rpg", ConsumableSheet, { types: ["consumable"], makeDefault: true, label: "Consumable Sheet" });
  Items.registerSheet("hollow-knight-rpg", EquipmentSheet, { types: ["equipment"], makeDefault: true, label: "Equipment Sheet" });

  registerHandlebarsHelpers();
  registerSystemSettings();
  await preloadTemplates();
});

async function preloadTemplates() {
  const templatePaths = [
    "systems/hollow-knight-rpg/templates/actors/bug-sheet.hbs",
    "systems/hollow-knight-rpg/templates/actors/npc-sheet.hbs",
    "systems/hollow-knight-rpg/templates/actors/creature-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/weapon-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/armor-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/charm-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/art-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/arcana-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/trait-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/path-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/consumable-sheet.hbs",
    "systems/hollow-knight-rpg/templates/items/equipment-sheet.hbs",
    "systems/hollow-knight-rpg/templates/chat/roll-card.hbs",
    "systems/hollow-knight-rpg/templates/chat/damage-card.hbs",
    "systems/hollow-knight-rpg/templates/chat/spell-card.hbs"
  ];
  return loadTemplates(templatePaths);
}

Hooks.once("ready", async function() {
  game.hollowKnight = {
    rolls: HollowKnightRolls,
    rollAttributeCheck: HollowKnightRolls.attributeCheck,
    rollAttack: HollowKnightRolls.attack,
    rollSoak: HollowKnightRolls.soak,
    rollSpell: HollowKnightRolls.spell
  };
});

Hooks.once("diceSoNiceReady", (dice3d) => {
  dice3d.addColorset({
    name: "hollow-knight",
    description: "Hollow Knight",
    category: "Colors",
    foreground: "#e8eaf0",
    background: "#252830",
    outline: "#7eb8d4",
    texture: "none"
  }, "preferred");
});

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type === "Item") {
    createHotbarMacro(data, slot);
    return false;
  }
});

async function createHotbarMacro(data, slot) {
  const item = await fromUuid(data.uuid);
  if (!item) return;

  const command = `game.hollowKnight.rollItem("${item.id}")`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);

  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "hollow-knight-rpg": { itemId: item.id } }
    });
  }

  game.user.assignHotbarSlot(macro, slot);
}

// --- GLOBAL CHAT HOOK FOR APPLYING DAMAGE / HEAL / DOT --- //
Hooks.on("renderChatMessage", (message, html, data) => {
    html.find(".chat-apply-damage").on("click", async (event) => {
        event.preventDefault();
        const btn = event.currentTarget;
        const baseDmg = parseInt(btn.dataset.damage) || 0;

        const tokens = canvas.tokens.controlled;
        if (tokens.length === 0) return ui.notifications.warn("Select one or more tokens on the map to apply damage!");

        const content = `
          <form>
              <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label>Base Damage (Roll)</label>
                  <input type="number" id="dmg-base" value="${baseDmg}" style="width:100px; text-align:center;" />
              </div>
              <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label>Additional Damage</label>
                  <input type="number" id="dmg-add" value="0" style="width:100px; text-align:center;" />
              </div>
              <div class="form-group" style="display:flex; justify-content:flex-end; margin-bottom:8px;">
                  <label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="dmg-double" /> <strong>Double Total Damage?</strong></label>
              </div>
              <div class="form-group" style="margin-bottom:8px;">
                  <label>Damage Type</label>
                  <select id="dmg-type" style="width:100%;">
                      <option value="physical">Physical (Allows Soak)</option>
                      <option value="magic">Magic (Ignores Soak & DR)</option>
                      <option value="environmental">Environmental (Ignores Soak & DR)</option>
                      <option value="stamina">Stamina Damage</option>
                      <option value="soul">Soul Damage</option>
                  </select>
              </div>
              <div class="form-group" style="margin-bottom:8px;">
                  <label>Soak Attribute</label>
                  <select id="dmg-attr" style="width:100%;">
                      <option value="shell" selected>Shell</option>
                      <option value="might">Might</option>
                      <option value="grace">Grace</option>
                      <option value="insight">Insight</option>
                      <option value="cute">Cute</option>
                      <option value="spook">Spook</option>
                  </select>
              </div>
              <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label>Bonus Soak Dice (+d6)</label>
                  <input type="number" id="dmg-bonus-dice" value="0" style="width:60px; text-align:center;" />
              </div>
              <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label>Bonus Absorption</label>
                  <input type="number" id="dmg-bonus-abs" value="0" style="width:60px; text-align:center;" />
              </div>
              <div class="form-group" style="display:flex; justify-content:flex-end;">
                  <label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="dmg-ignore-dr"/> Ignore Armor DR?</label>
              </div>
          </form>
        `;

        new Dialog({
            title: "Apply Damage to Targets",
            content: content,
            buttons: {
                apply: {
                    icon: '<i class="fas fa-skull"></i>',
                    label: "Apply",
                    callback: async (html) => {
                        const base = parseInt(html.find("#dmg-base").val()) || 0;
                        const add = parseInt(html.find("#dmg-add").val()) || 0;
                        const double = html.find("#dmg-double").is(":checked");
                        
                        let finalAmount = base + add;
                        if (double) finalAmount *= 2;

                        const type = html.find("#dmg-type").val();
                        const attr = html.find("#dmg-attr").val();
                        const bonusDice = parseInt(html.find("#dmg-bonus-dice").val()) || 0;
                        const bonusAbs = parseInt(html.find("#dmg-bonus-abs").val()) || 0;
                        const ignoreDR = html.find("#dmg-ignore-dr").is(":checked");

                        for (const t of tokens) {
                            if(t.actor) {
                                await t.actor.applyDamage(finalAmount, {
                                    damageType: type,
                                    soakAttribute: attr,
                                    bonusSoakDice: bonusDice,
                                    bonusAbsorption: bonusAbs,
                                    ignoreDR: ignoreDR
                                });
                            }
                        }
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "apply"
        }).render(true);
    });

    html.find(".chat-apply-heal").on("click", async (event) => {
        event.preventDefault();
        const tokens = canvas.tokens.controlled;
        if (tokens.length === 0) return ui.notifications.warn("Select one or more tokens on the map to heal!");

        const content = `
            <form>
                <div class="form-group" style="margin-bottom:8px;">
                    <label>Amount to Heal/Restore</label>
                    <input type="number" id="heal-amount" value="1" min="1" autofocus style="width:100%; text-align:center;" />
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label>Target Pool</label>
                    <select id="heal-pool" style="width:100%;">
                        <option value="heart" selected>Hearts</option>
                        <option value="stamina">Stamina</option>
                        <option value="soul">Soul</option>
                        <option value="belly">Belly (Hunger)</option>
                    </select>
                </div>
            </form>
        `;

        new Dialog({
            title: "Heal Targets",
            content: content,
            buttons: {
                apply: {
                    icon: '<i class="fas fa-heart"></i>',
                    label: "Heal",
                    callback: async (html) => {
                        const amount = parseInt(html.find("#heal-amount").val()) || 1;
                        const pool = html.find("#heal-pool").val();
                        for (const t of tokens) {
                            if(t.actor) {
                                await t.actor.heal(amount, pool);
                            }
                        }
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "apply"
        }).render(true);
    });

    html.find(".chat-apply-dot").on("click", async (event) => {
        event.preventDefault();
        const tokens = canvas.tokens.controlled;
        if (tokens.length === 0) return ui.notifications.warn("Select one or more tokens to apply DoT!");

        const content = `
            <form>
                <div class="form-group" style="margin-bottom:8px;">
                    <label>DoT Stacks/Points</label>
                    <input type="number" id="dot-amount" value="1" min="1" autofocus style="width:100%; text-align:center;" />
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label>Condition Name (e.g. Poison, Bleed)</label>
                    <input type="text" id="dot-name" placeholder="Poison" style="width:100%; text-align:center;" />
                </div>
            </form>
        `;

        new Dialog({
            title: "Apply Damage over Time (DoT)",
            content: content,
            buttons: {
                apply: {
                    icon: '<i class="fas fa-burn"></i>',
                    label: "Apply DoT",
                    callback: async (html) => {
                        const amount = parseInt(html.find("#dot-amount").val()) || 1;
                        const name = html.find("#dot-name").val() || "Typeless";
                        
                        for (const t of tokens) {
                            if(t.actor) {
                                const currentDots = t.actor.system.conditions.dots || [];
                                currentDots.push({ id: foundry.utils.randomID(), name: name, value: amount });
                                await t.actor.update({"system.conditions.dots": currentDots});
                                ChatMessage.create({ 
                                    speaker: ChatMessage.getSpeaker({ actor: t.actor }), 
                                    content: `<div class="hk-damage-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
                                        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-accent-red); padding-bottom:5px; color:var(--hk-accent-red);">Afflicted by DoT</h3>
                                        <p><strong>${t.actor.name}</strong> was afflicted with <strong>${amount} ${name} DoT</strong>!</p>
                                    </div>`
                                });
                            }
                        }
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "apply"
        }).render(true);
    });
});