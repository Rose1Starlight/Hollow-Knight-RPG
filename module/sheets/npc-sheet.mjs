/**
 * NpcSheet - Actor sheet for NPCs
 */
export class NpcSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hollow-knight", "sheet", "actor", "npc"],
      template: "systems/hollow-knight-rpg/templates/actors/npc-sheet.hbs",
      width: 720,
      height: 800,
      tabs: [{ navSelector: ".hk-tabs", contentSelector: ".hk-tab-content", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  async getData() {
    const context = super.getData();

    // Ligar os dados diretamente aos cálculos derivados do Actor
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    context.config = CONFIG.HOLLOW_KNIGHT || {};

    context.items = {};
    for (const item of this.actor.items) {
      if (!context.items[item.type]) context.items[item.type] = [];
      context.items[item.type].push(item);
    }

    for (const type of Object.keys(context.items)) {
      context.items[type].sort((a, b) => a.name.localeCompare(b.name));
    }

    context.traitHierarchy = [];
    const allTraits = context.items.trait || [];
    const parentTraits = allTraits.filter(t => !t.system.isSubTrait);
    const subTraits = allTraits.filter(t => t.system.isSubTrait);

    parentTraits.forEach(p => {
      const children = subTraits.filter(s => s.system.parentTrait?.toLowerCase() === p.name.toLowerCase());
      context.traitHierarchy.push({ parent: p, children: children });
    });

    subTraits.forEach(s => {
      if (!parentTraits.some(p => p.name.toLowerCase() === s.system.parentTrait?.toLowerCase())) {
        context.traitHierarchy.push({ parent: s, children: [] });
      }
    });

    context.proficiencies = Object.entries(this.actor.system.proficiencies || {}).map(([id, data]) => {
      return { 
          id, 
          ...data,
          skillList: data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : []
      };
    });

    context.derived = {
      notchUsage: this.actor.system.notchesUsed || 0,
      notchMax: this.actor.system.secondaryAttributes?.notches?.value || 3,
      isOvercharmed: this.actor.system.isOvercharmed || false,
      totalDR: this.actor._getTotalDR ? this.actor._getTotalDR() : 0
    };

    // Resolução assíncrona obrigatória para o Foundry v11/v12 não bloquear os campos de texto
    context.enrichedDescription = await TextEditor.enrichHTML(this.actor.system.details.biography || "", { async: true });

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    html.find(".attr-rollable").on("click", this._onAttributeRoll.bind(this));
    html.find(".pool-adjust").on("click", this._onPoolAdjust.bind(this));
    
    html.find(".prof-create").on("click", this._onProficiencyCreate.bind(this));
    html.find(".prof-edit").on("click", this._onProficiencyEdit.bind(this));
    html.find(".prof-delete").on("click", this._onProficiencyDelete.bind(this));
    html.find(".prof-roll").on("click", this._onProficiencyRoll.bind(this));

    html.find(".item-expand").on("click", this._onItemSummary.bind(this)); 

    html.find(".item-create").on("click", this._onItemCreate.bind(this));
    html.find(".item-edit").on("click", this._onItemEdit.bind(this));
    html.find(".item-delete").on("click", this._onItemDelete.bind(this));
    html.find(".item-toggle").on("click", this._onItemToggle.bind(this));
    html.find(".item-roll").on("click", this._onItemRoll.bind(this));
    html.find(".item-consume").on("click", this._onItemConsume.bind(this));
    
    html.find(".charm-toggle").on("click", this._onCharmToggle.bind(this));
    html.find(".rest-btn").on("click", this._onRest.bind(this));
  }

  async _onAttributeRoll(event) {
    event.preventDefault();
    const attribute = event.currentTarget.dataset.attribute;
    const attrName = attribute.charAt(0).toUpperCase() + attribute.slice(1);

    const content = `
      <form>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Bonus Dice (+d6)</label>
              <input type="number" id="attr-dice-bonus" value="0" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Target Die (Default 5+)</label>
              <input type="number" id="attr-target-die" value="5" min="2" max="6" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center;">
              <label>Goal (Successes)</label>
              <input type="number" id="attr-target-succ" value="1" min="1" style="width:120px; text-align:center;" />
          </div>
      </form>
    `;

    new Dialog({
      title: `Roll ${attrName}`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: "Roll",
          callback: async (html) => {
            const dBonus = parseInt(html.find("#attr-dice-bonus").val()) || 0;
            const targetDie = parseInt(html.find("#attr-target-die").val()) || 5;
            const targetSucc = parseInt(html.find("#attr-target-succ").val()) || 1;
            await this.actor.rollAttributeCheck(attribute, { 
                bonusDice: dBonus, 
                targetDie: targetDie,
                targetSuccesses: targetSucc
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }

  async _onItemSummary(event) {
    event.preventDefault();
    const container = $(event.currentTarget).closest(".hk-item-container, .hk-prof-container");
    const summary = container.find(".hk-item-summary");
    const icon = $(event.currentTarget).find("i");
    
    summary.toggleClass("hk-hidden");
    if(summary.hasClass("hk-hidden")) {
        icon.removeClass("fa-chevron-down").addClass("fa-chevron-right");
    } else {
        icon.removeClass("fa-chevron-right").addClass("fa-chevron-down");
    }
  }

  async _onProficiencyCreate(event) {
    event.preventDefault();
    const newId = foundry.utils.randomID();
    await this.actor.update({
      [`system.proficiencies.${newId}`]: { name: "New Proficiency", rank: 1, skills: "", description: "" }
    });
    this._openProficiencyDialog(newId, true);
  }

  async _onProficiencyEdit(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-prof-id]").dataset.profId;
    this._openProficiencyDialog(id, false);
  }

  _openProficiencyDialog(profId, isNew = false) {
    const prof = this.actor.system.proficiencies[profId];
    if (!prof) return;

    const content = `
      <form style="padding:10px;">
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block; margin-bottom:4px;">Proficiency Name</label>
          <input type="text" id="prof-name" value="${prof.name}" style="width:100%; padding:4px;" />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block; margin-bottom:4px;">Rank</label>
          <input type="number" id="prof-rank" value="${prof.rank}" min="0" max="3" style="width:100%; padding:4px;" />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block; margin-bottom:4px;">Skills (comma separated)</label>
          <input type="text" id="prof-skills" value="${prof.skills || ''}" placeholder="e.g., Athletics, Medicine..." style="width:100%; padding:4px;" />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-weight:bold; display:block; margin-bottom:4px;">Description / Effect</label>
          <textarea id="prof-desc" style="width:100%; height:80px; padding:4px; resize:vertical;">${prof.description || ''}</textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: isNew ? "Create Proficiency" : "Edit Proficiency",
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          callback: async (html) => {
            const name = html.find("#prof-name").val();
            const rank = parseInt(html.find("#prof-rank").val()) || 0;
            const skills = html.find("#prof-skills").val();
            const description = html.find("#prof-desc").val();
            await this.actor.update({
              [`system.proficiencies.${profId}`]: { name, rank, skills, description }
            });
          }
        },
        cancel: {
          label: "Cancel",
          callback: async () => {
            if (isNew) {
              await this.actor.update({ [`system.proficiencies.-=${profId}`]: null });
            }
          }
        }
      },
      default: "save"
    }).render(true);
  }

  async _onProficiencyDelete(event) {
    event.preventDefault();
    const id = event.currentTarget.closest("[data-prof-id]").dataset.profId;
    if (confirm("Delete this Proficiency?")) {
      await this.actor.update({ [`system.proficiencies.-=${id}`]: null });
    }
  }

  async _onProficiencyRoll(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".hk-prof-container");
    const profId = row.dataset.profId;
    const profData = this.actor.system.proficiencies[profId];
    
    const profName = profData.name || "Skill";
    const profRank = parseInt(profData.rank) || 0;
    
    const clickedSkill = event.currentTarget.dataset.skillName;
    const displayName = clickedSkill ? `${clickedSkill} (${profName})` : profName;

    const content = `
      <form>
          <p>Preparing roll for <strong>${displayName}</strong> (Ranks: ${profRank})</p>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Base Attribute</label>
              <select id="skill-attr" style="width:120px; text-align:center;">
                  <option value="might">Might</option>
                  <option value="insight">Insight</option>
                  <option value="shell">Shell</option>
                  <option value="grace">Grace</option>
                  <option value="cute">Cute</option>
                  <option value="spook">Spook</option>
              </select>
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Bonus Dice (+d6)</label>
              <input type="number" id="skill-bonus-dice" value="0" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label>Target Die (Default 5+)</label>
              <input type="number" id="skill-target-die" value="5" min="2" max="6" style="width:120px; text-align:center;" />
          </div>
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center;">
              <label>Goal (Successes)</label>
              <input type="number" id="skill-target-succ" value="1" min="1" style="width:120px; text-align:center;" />
          </div>
      </form>
    `;

    new Dialog({
      title: `Roll Skill Action`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: "Roll",
          callback: async (html) => {
            const attr = html.find("#skill-attr").val();
            const bDice = parseInt(html.find("#skill-bonus-dice").val()) || 0;
            const targetDie = parseInt(html.find("#skill-target-die").val()) || 5;
            const targetSucc = parseInt(html.find("#skill-target-succ").val()) || 1;
            
            await this.actor.rollAttributeCheck(attr, { 
              skillRank: profRank, 
              bonusDice: bDice, 
              targetDie: targetDie,
              targetSuccesses: targetSucc,
              skillName: displayName 
            });
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "roll"
    }).render(true);
  }

  async _onItemConsume(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const uses = item.system.uses || 0;
    if (uses <= 0) return ui.notifications.warn("No charges left!");

    await item.update({ "system.uses": uses - 1 });

    const belly = item.system.bellyRestored || 0;
    const heart = item.system.heartRestored || 0;
    const stamina = item.system.staminaRestored || 0;
    const soul = item.system.soulRestored || 0;

    const updates = {};
    const actorSystem = this.actor.system;
    
    if (belly) updates["system.pools.belly.value"] = Math.min(20, actorSystem.pools.belly.value + belly);
    if (heart) updates["system.pools.heart.value"] = Math.min(actorSystem.pools.heart.max, actorSystem.pools.heart.value + heart);
    if (stamina) updates["system.pools.stamina.value"] = Math.min(actorSystem.pools.stamina.max, actorSystem.pools.stamina.value + stamina);
    if (soul) updates["system.pools.soul.value"] = Math.min(actorSystem.pools.soul.max, actorSystem.pools.soul.value + soul);

    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
      if (heart > 0 && actorSystem.pools.heart.value > 0 && actorSystem.conditions.atDeathsDoor) {
         await this.actor.update({"system.conditions.atDeathsDoor": false});
      }
    }

    const flavor = `<div class="hk-item-card" style="background:var(--hk-bg-panel); border:1px solid var(--hk-border); padding:10px; border-radius:6px; color:var(--hk-text-primary);">
        <img src="${item.img}" width="36" height="36" style="border-radius:4px; float:left; margin-right:8px;">
        <h3 style="margin-top:0; border-bottom:1px solid var(--hk-border-light); padding-bottom:5px; color:var(--hk-accent-blue);">Used: ${item.name}</h3>
        <div style="clear:both; margin-top:10px; font-size: 0.9rem;">
           ${belly ? `<span style="color:var(--hk-text-primary);">Belly +${belly}</span><br>` : ""}
           ${heart ? `<span style="color:var(--hk-heart-color);">Heart +${heart}</span><br>` : ""}
           ${stamina ? `<span style="color:var(--hk-stamina-color);">Stamina +${stamina}</span><br>` : ""}
           ${soul ? `<span style="color:var(--hk-soul-color);">Soul +${soul}</span><br>` : ""}
        </div>
        <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;">
            <button class="chat-apply-heal" title="Apply Heal" style="width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--hk-accent-green); color:#1a1c23; border:none; border-radius:4px; cursor:pointer;"><i class="fas fa-heart"></i></button>
        </div>
    </div>`;

    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: flavor });
  }

  async _onPoolAdjust(event) {
    event.preventDefault();
    const pool = event.currentTarget.dataset.pool;
    const isGlory = event.currentTarget.dataset.glory === "true";
    const delta = parseInt(event.currentTarget.dataset.delta);

    if (isGlory) {
        const current = foundry.utils.getProperty(this.actor, `system.gloryPools.${pool}.value`) || 0;
        const newValue = Math.max(0, current + delta);
        await this.actor.update({ [`system.gloryPools.${pool}.value`]: newValue });
    } else {
        const current = this.actor.system.pools[pool]?.value || 0;
        const max = this.actor.system.pools[pool]?.max || 999;
        const newValue = Math.max(0, Math.min(max, current + delta));
        await this.actor.update({ [`system.pools.${pool}.value`]: newValue });
    }
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    await Item.create({ name, type, system: {} }, { parent: this.actor });
  }

  async _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item && confirm(`Delete ${item.name}?`)) await item.delete();
  }

  async _onItemToggle(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) await item.update({ "system.equipped": !item.system.equipped });
  }

  async _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.roll();
  }

  async _onCharmToggle(event) {
    event.preventDefault();
    const charmId = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const charm = this.actor.items.get(charmId);
    if (charm) {
      const newEquipped = !charm.system.equipped;
      if (newEquipped) {
        const currentUsage = this.actor.system.notchesUsed || 0;
        const maxNotches = this.actor.system.secondaryAttributes?.notches?.value || 3;
        if (currentUsage + (charm.system.notchCost || 1) > maxNotches) {
          return ui.notifications.warn("Not enough Notches to equip this charm!");
        }
      }
      await charm.update({ "system.equipped": newEquipped });
    }
  }

  async _onRest(event) {
    event.preventDefault();
    const slept = event.currentTarget.dataset.slept === "true";
    await this.actor.rest({ slept });
  }
}