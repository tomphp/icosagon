# Neuroevolution, not gradient training, for the Neural Strategy

Models are trained by evolving a Population of networks that play each other (and Greedy), keeping the fittest and mutating them. We chose this over the more usual, more sample-efficient alternative, a single value network trained by backprop on self-play outcomes, because the point of the feature is to watch networks compete and improve over Generations, and evolution needs no gradient code. The cost is that Training needs many more games per unit of strength. That's acceptable because games are cheap and Training runs across all cores.

## Consequences

- A Model file holds the whole Population, not just one network, so Training can resume from it without losing diversity.
- Fitness is the average Score margin rather than wins, so a weak early Population can still be ranked.
- Greedy is part of every Generation's opponents, which anchors the Population to an absolute standard. Otherwise it could drift into strategies that only beat each other.
