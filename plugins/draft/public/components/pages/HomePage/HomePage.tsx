import * as React from "react";
import Button from "../../ui/button/Button/Button";

export default class HomePage extends React.Component<any, any> {
  
  constructor(props) {
    super(props);
    this.state = {
      events: [
        {name: "Cull the Weak", description: "Destroy every damaged ally with 1 health."},
        {name: "Strange Suppliers", description: "Each player puts a random card (without looking at it) from the draft pile into their resource row face down and exhausted."},
        {name: "Magical Gravestones", description: "Each player repeats the top three ability cards from their graveyard. Each player takes turn playing one ability starting with the one who drew this event."},
        {name: "The Last Straw", description: "The player who drew this event draws cards from the draft pile equal to the number of players in the game. Each opponent, starting to the left, then picks a card at random and puts it into play followed by the player who drew this event."},
        {name: "Ration(ality)", description: "Each player heals damage from their hero equal to the number of allies on the opponent's side of the field."},
        {name: "Last Stand", description: "If there is more than 15 cards in each players graveyard, each player plays every ally in their deck. The player with the most combined attack and health on the field wins."},
        {name: "[NAME], the Betrayer", description: "Each player chooses an ally and gives control of it to the opponent on the right."},
        {name: "Slot Machine", description: "The player who drew this event puts into play a 'Slot Machine' ability token with 3 coin tokens. During the draw phase he may remove one or more coin tokens to draw that amount of cards from the draft pile instead of their deck."},
        {name: "Whelps! Handle it!", description: "Each opponent may put a 1/1 Onyxian Whelp token into play for each ally the player who drew this event has on the field."},
        {name: "Your Fortune Awaits You", description: "Put into play a 'Your Fortune Awaits You' quest card with the following effect: You may pay (3) to complete this quest. Draw a card... Or you may pay (3) to complete this quest. Draw a card. Then choose a player who may draw a card from the draft pile. Then destroy an ally. Then destroy an ability. Then destroy an equipment. And lastly put a 1/1 'Fortune' token into play."},
        {name: "Your Death Awaits You", description: "Put into play a 'Your Death Awaits You' quest with the following effect: Each player may complete this quest by paying (12). Destroy the hero of the player who played this quest. Draw a card."},
        {name: "Living Weapons", description: "Each weapon becomes an ally until they leave play. Each weapon gains attack equal to their equipment attack and health equal to their strike cost plus 2."},
        {name: "Ogre Strength", description: "Your hero may equip up to any number of target allies as a two-handed maces up to the number you can wield. The strike cost of the weapon is equal to the ally's undamaged health."},
        {name: "Titanic Strength", description: "Ongoing: Your hero may equip any two non-ranged weapons at the same time."},
        {name: "Elvish Strength", description: "Ongoing: Your hero may equip any two ranged weapons at the same time."},
        {name: "A Dull Morning", description: "Destroy any ongoing events. Blame yourself for forgetting about last night's events."},
        {name: "A Dull Noon", description: "Shuffle the event deck. This won't change anything, but you will still blame the RNG."},
        {name: "A Dull Afternoon", description: "Nothing happens. You have yourself to blame for this."},
        {name: "A Dull Evening", description: "Your opponent skips his next event phase. He will blame you for this."},
        {name: "A Dull Night", description: "Draw another event card. Interrupt its effect and shuffle it back into the event deck. You will blame the developers for this."},
        {name: "Supplies", description: "Draw a random card from the draft pile."},
        {name: "Butterfly Effect", description: "Play the last event card again. If it's ongoing, it's effect is applied twice if applicable."},
        {name: "Not So Dull After All", description: "Play the next two event cards. If this card was going to be interrupted, play four event cards instead."},
        {name: "An Eventful Morning", description: "Each player chooses a card in their hand. Each card which doesn't share the highest cost is put into play."},
        {name: "An Eventful Noon", description: "Each player draws three cards from the draft pile. Each player chooses one of those three cards and puts it into play, then discards the other two cards to the draft pile."},
        {name: "An Eventful Afternoon", description: "Each player puts a 0/3 'BBQ' ally token into play with 5 food tokens which cannot become exhausted. Each player may exhaust a hero or ally to remove a food token and heal 3 damage."},
        {name: "An Eventful Evening", description: "Each player may ready up to four resources. Each card in each players hand is instant during this turn."},
        {name: "An Eventful Night", description: "Ongoing: Each player draws two event cards instead of one. Once every player has played an event card, destroy this event."},
        
      ]
    };
    this.getRandomEvent = this.getRandomEvent.bind(this);
  }
  
  private getRandomEvent() {
    this.setState({event: Math.random()});
  }
  
  render() {
    return (
      <div className="page" id="page-home">
        <h2>Home</h2>
        <div>
          <Button label="Random Event" callback={this.getRandomEvent}/>
        </div>
        <div className="event">
          <span>{this.state.event}</span>
        </div>
      </div>
    );
  }
}
