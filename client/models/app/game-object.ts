/**
 * Data structure for auto
 * @date 1/9/2024 - 11:12:36 AM
 *
 * @export
 * @typedef {Auto}
 */
export type Auto = {
    test: string;
};
/**
 * Data structure for teleop
 * @date 1/9/2024 - 11:12:36 AM
 *
 * @export
 * @typedef {Teleop}
 */
export type Teleop = {};
/**
 * Data structure for endgame
 * @date 1/9/2024 - 11:12:36 AM
 *
 * @export
 * @typedef {Endgame}
 */
export type Endgame = {};

/**
 * Data structure for game object
 * @date 1/9/2024 - 11:12:36 AM
 *
 * @export
 * @typedef {GameObject}
 */
export type GameObject = {
    auto: Auto;
    teleop: Teleop;
    endgame: Endgame;
};
