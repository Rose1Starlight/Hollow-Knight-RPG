/**
 * Register system settings for Hollow Knight RPG
 */
export function registerSystemSettings() {
    game.settings.register("hollow-knight-rpg", "autoSoak", {
        name: "Automatic Soak Rolls",
        hint: "Automatically roll soak when damage is applied to actors.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("hollow-knight-rpg", "showRollDetails", {
        name: "Show Roll Details",
        hint: "Display detailed dice results in chat cards.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("hollow-knight-rpg", "deathDoorRecovery", {
        name: "Death's Door Stamina Recovery",
        hint: "Restore full stamina on first Death's Door trigger per rest.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
}