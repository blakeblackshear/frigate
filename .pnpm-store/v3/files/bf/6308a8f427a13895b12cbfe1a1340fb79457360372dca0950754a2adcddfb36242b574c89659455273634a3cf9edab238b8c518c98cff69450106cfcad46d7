import { RestWalker } from "./rest.js";
import { first } from "./first.js";
import { assign, forEach } from "lodash-es";
import { IN } from "../constants.js";
import { Alternative } from "@chevrotain/gast";
// This ResyncFollowsWalker computes all of the follows required for RESYNC
// (skipping reference production).
export class ResyncFollowsWalker extends RestWalker {
    constructor(topProd) {
        super();
        this.topProd = topProd;
        this.follows = {};
    }
    startWalking() {
        this.walk(this.topProd);
        return this.follows;
    }
    walkTerminal(terminal, currRest, prevRest) {
        // do nothing! just like in the public sector after 13:00
    }
    walkProdRef(refProd, currRest, prevRest) {
        const followName = buildBetweenProdsFollowPrefix(refProd.referencedRule, refProd.idx) +
            this.topProd.name;
        const fullRest = currRest.concat(prevRest);
        const restProd = new Alternative({ definition: fullRest });
        const t_in_topProd_follows = first(restProd);
        this.follows[followName] = t_in_topProd_follows;
    }
}
export function computeAllProdsFollows(topProductions) {
    const reSyncFollows = {};
    forEach(topProductions, (topProd) => {
        const currRefsFollow = new ResyncFollowsWalker(topProd).startWalking();
        assign(reSyncFollows, currRefsFollow);
    });
    return reSyncFollows;
}
export function buildBetweenProdsFollowPrefix(inner, occurenceInParent) {
    return inner.name + occurenceInParent + IN;
}
export function buildInProdFollowPrefix(terminal) {
    const terminalName = terminal.terminalType.name;
    return terminalName + terminal.idx + IN;
}
//# sourceMappingURL=follow.js.map