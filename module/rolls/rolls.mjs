/**
 * HollowKnightRolls - Core rolling mechanics for the system
 */
export class HollowKnightRolls {

    /**
     * Roll an attribute check (Might, Insight, Shell, Grace)
     * @param {Actor} actor - The actor making the roll
     * @param {string} attribute - Attribute name
     * @param {object} options - Roll options {skillRank, rerolls, difficulty}
     */
    static async attributeCheck(actor, attribute, options = {}) {
        const attrValue = actor.system.attributes[attribute]?.value ?? 3;
        const skillRank = options.skillRank ?? 0;
        const baseDice = Math.floor(attrValue);
        const rerolls = options.rerolls ?? (attrValue % 1 >= 0.5 ? 1 : 0);
        const diceCount = baseDice + skillRank;

        if (diceCount <= 0) {
            ui.notifications.warn("No dice to roll!");
            return 0;
        }

        const roll = await new Roll(`${diceCount}d6`).evaluate();
        let successes = roll.terms[0].results.filter(r => r.result >= 5).length;

        // Handle rerolls on failed dice
        if (rerolls > 0) {
            const failedResults = roll.terms[0].results.filter(r => r.result < 5);
            const rerollCount = Math.min(rerolls, failedResults.length);
            if (rerollCount > 0) {
                const reroll = await new Roll(`${rerollCount}d6`).evaluate();
                successes += reroll.terms[0].results.filter(r => r.result >= 5).length;
            }
        }

        const flavor = `<div class="hk-roll-card"><h3>${attribute.charAt(0).toUpperCase() + attribute.slice(1)} Check</h3><p>Dice: ${diceCount}d6 | Successes: <strong>${successes}</strong></p></div>`;
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
        return successes;
    }

    /**
     * Roll an attack with a weapon
     */
    static async attack(actor, weapon, options = {}) {
        const isRanged = weapon.system.range?.toLowerCase().includes("range");
        const attribute = isRanged ? "grace" : "might";
        const attrValue = actor.system.attributes[attribute]?.value ?? 3;
        const quality = weapon.system.effectiveQuality ?? weapon.system.quality ?? 1;
        const staminaDedicated = options.staminaDedicated ?? 1;
        const diceCount = Math.floor(attrValue) + quality + staminaDedicated;

        const roll = await new Roll(`${diceCount}d6`).evaluate();
        const successes = roll.terms[0].results.filter(r => r.result >= 5).length;

        let damage = 0;
        if (successes > 0) {
            const baseDmg = weapon.system.effectiveDamage ?? weapon.system.damage ?? 3;
            const rolloverCap = Math.max(baseDmg, staminaDedicated);
            const rollover = Math.min(successes - 1, rolloverCap);
            damage = baseDmg + rollover;
        }

        const flavor = `<div class="hk-attack-card"><h3>${weapon.name}</h3><p>Successes: <strong>${successes}</strong>${damage > 0 ? ` | Damage: <strong>${damage}</strong>` : ""}</p></div>`;
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
        return { successes, damage };
    }

    /**
     * Roll soak against incoming damage
     */
    static async soak(actor, damage, options = {}) {
        const shellValue = actor.system.attributes.shell?.value ?? 3;
        const diceCount = Math.floor(shellValue);

        if (diceCount <= 0) return damage;

        const roll = await new Roll(`${diceCount}d6`).evaluate();
        const successes = roll.terms[0].results.filter(r => r.result >= 5).length;
        const reducedDamage = Math.max(0, damage - successes);

        const flavor = `<div class="hk-soak-card"><h3>Soak Roll</h3><p>Incoming: ${damage} | Soaked: ${successes} | Final: <strong>${reducedDamage}</strong></p></div>`;
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
        return reducedDamage;
    }

    /**
     * Roll a spell casting
     */
    static async spell(actor, arcana, options = {}) {
        const soulCost = arcana.system.soulCost ?? arcana.system.difficulty ?? 1;
        if (actor.system.pools.soul.value < soulCost) {
            ui.notifications.warn("Not enough Soul!");
            return null;
        }

        await actor.update({ "system.pools.soul.value": actor.system.pools.soul.value - soulCost });

        const insight = actor.system.attributes.insight?.value ?? 3;
        const pathRank = options.pathRank ?? 0;
        const diceCount = Math.floor(insight) + pathRank;

        const roll = await new Roll(`${diceCount}d6`).evaluate();
        const successes = roll.terms[0].results.filter(r => r.result >= 5).length;

        const flavor = `<div class="hk-spell-card"><h3>${arcana.name}</h3><p>Soul Cost: ${soulCost} | Successes: <strong>${successes}</strong></p><p class="description">${arcana.system.effect || arcana.system.description || ""}</p></div>`;
        await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
        return { successes, soulCost };
    }

    /**
     * Roll initiative using Grace
     */
    static async initiative(actor) {
        const grace = actor.system.attributes.grace?.value ?? 3;
        const diceCount = Math.floor(grace);
        const roll = await new Roll(`${diceCount}d6`).evaluate();
        const total = roll.terms[0].results.reduce((sum, r) => sum + r.result, 0);
        return total;
    }
}