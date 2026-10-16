# Neuroevolution, not gradient training, for the Neural Strategy

Models are trained by evolving a Population of networks that play each other (and the scripted Strategies), keeping the fittest and mutating them. We chose this over the more usual, more sample-efficient alternative, a single value network trained by backprop on self-play outcomes, because the point of the feature is to watch networks compete and improve over Generations, and evolution needs no gradient code. The cost is that Training needs many more games per unit of strength. That's acceptable because games are cheap and Training runs across all cores.

## Consequences

- A Model file holds the whole Population, not just one network, so Training can resume from it without losing diversity.
- Fitness is the average Score margin rather than wins, so a weak early Population can still be ranked.
- Greedy, Hoarder and Clever Hoarder are part of every Generation's opponents, which anchors the Population to an absolute standard. Otherwise it could drift into strategies that only beat each other.

## Revisited: gradient training (October 2026)

The training-improvement experiments (`.scratch/training-improvement/spec.md`) tested the alternative directly. `npm run fit` now fits a network by backprop, so the repo does have gradient code. But Training itself stays evolution:

- Fitted Models vary much more by seed than evolved ones: −0.060 on average with a spread of 0.310, against evolution's +0.054 with a spread of 0.124 (ticket 06). So `fit` is kept as a separate command for making Models, not as the training method.
- Adding TD(λ) learning to each Generation's survivors (ticket 09) did worse than evolution alone at every learning rate tried, so it was removed.
