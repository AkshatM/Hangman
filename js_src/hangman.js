;(function() {
    
var Form = React.createClass({
    
// A <form /> element. Generic form element with two-way event binding support
// for submission - more simply, I can have a parent component execute something
// when this form element submits, and have the form customise itself to behave 
// depending on the props/state I pass in. Consists of a label, a form submission
// button, and an input field.
    
// This particular form only supports two states: a character entry state and an
// email state. This is sufficient for our needs. However, future iterations can 
// customise and tweak this to handle state more generically.

// Props: 
//         @ submit: (type: Function (event)) An event handler bound to the 
//                   parent. When this form submits, it internally handles some 
//                   cleanup before passing the event to this handler.
    
//         @ active: (type: Boolean rendered as String) Lets the parent define the form
//                   content. If "true", this form only accepts Hangman characters during a game; 
//                   if "false" or other, this form reverts to taking in emails for a new
//                   game. IF you want a more generic form, it is recommended to get rid
//                   of this prop and pass labels/requirements directly through props.

// States:
//         @ value: (type: null || String) Controls the value of <input> element inside form.        
    
    getInitialState: function() {
        return {value: null};
    },
    
    getDefaultProps: function() {
        return {active: "true"};
    },
    
    // this function handles the onSubmit event before passing control of the event 
    // to the parent. 
    handleSubmission: function (event){
        event.preventDefault(); // prevent page refresh
        this.refs["button"].disable = true; // disable the form submit button to prevent multiple submissions
        this.props.submit(event); // pass event to parent handler
        if (this.props.active === "true") { // if in character handling stage ...
            this.setState({value:null}); // ... reset the input field and trigger re-render once parent finishes
        }
    },
    
    // this function handles changes in the controlled <input> field. Forces a re-render of <Form />.
    handleChange: function(event) {
        this.setState({value: event.target.value}); // updates value to whatever is currently in the input.
    },
    
    // returns a label, <input> and button wrapped in <form> tags. Note that <input> behaves substantially differently
    // depending on whether a game is active or not.
    render: function() {
        
        return (
            <form onSubmit={this.handleSubmission}>
            {this.props.active === "true" ? 
                    <label htmlFor="input">Type in only ONE English character between a-z</label> : 
                    <label htmlFor="input">Type in your email to start a game</label>
            }
            {this.props.active === "true" ? 
                <input type="text" id="input" required className="u-half-width" maxLength="1" value = {this.state.value} pattern="[A-Za-z]" placeholder="a-z OR A-Z" title = "Alphabetical characters only" autoComplete="off" onChange={this.handleChange}/> : 
                <input type="email" id="input" required className="u-full-width" value = {this.state.value} placeholder="username@example.com" onChange={this.handleChange}/> 
            }
            <button ref = "button" className="button-primary" type="Submit">{this.props.active === "true"? "Enter" : "Begin"}</button>
            </form>
       );
    }
});
    
var Login = React.createClass({

// A <form /> element with unique submission handling requirements. Specifically, it triggers a new game after initial page load
// and replaces the content of the DOM entirely with <Parent /> using the email that the user provides. Autocomplete is enabled on 
// the form so that returning players on a modern browser are able to 'log in' with their email without typing it all out.

// As for why I have taken the possibly expensive approach of replacing the contents of the DOM entirely when it is 
// perfectly pre-loaded by non-React components, please consult the README for explanation of the design decisions I chose to make.
// In particular, I wanted a low-speed internet user to experience a fast page render prior to Javascript loading - so I choose to 
// introduce HTML (which is quickly parsed and rendered) that mimics <Parent /> when completed. After login finishes, <Parent /> 
// takes over completely. The rendering time is about ~500 ms for mounting <Parent />, so the cost is minimal and the concurrent 
// benefits of keeping the user engaged before Javascript loading is huge.

// Props: None
// States: 
    
//         @ network: (type: Boolean) Indicates whether network connectivity is lost or enabled. Specifies 
//                   different rendering behaviour in either case.
    
    getInitialState: function() {
        return {network:true};
    },
    
    submit: function(event){
        var email_id = JSON.parse(JSON.stringify(this.refs["form"].state.value)); // get email input from Form
        var request = JSON.stringify({email: email_id}); // construct new payload
        var xhr = new XMLHttpRequest(); 
        xhr.open('POST', <API>, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        var self = this;
        xhr.onerror = function () {
            self.setState({network: false});
        }
        xhr.onload = function () {
            // obtain a game state and mount <Parent /> into place. 
            var game_state = JSON.parse(this.responseText);
            ReactDOM.render(<Parent gameState = {game_state} login = {email_id}/>, document.getElementById('content'));
        };
        xhr.send(request);
    
    },
    
    render: function() {
        
        // <Form />'s internal onSubmit call is now bound to this parent.
        return (
            <div>
            {this.state.network === false? <p><i> Unfortunately, network connectivity issues are preventing your input from being sent. Please check your network and try entering input again. </i></p> : null}
            <Form ref="form" active={false} submit={this.submit.bind(this)} />
            </div>
        );
    }
});

var HangmanScaffold = React.createClass({
    
// An <SVG /> element. Defines the scaffolding we see on the main page. Defined only to reduce rendering time by setting
// shouldComponentUpdate false for this element.
    
// Props: None
// State: None.
    
    // saves important re-rendering time when Parent has to update. This NEVER needs to change.
    shouldComponentUpdate: function(nextProps,nextState){
      return false;  
    },
    
    // 
    render: function() {
        return(
        <svg version="1.1" viewBox="0 0 500 500" preserveAspectRatio="xMinYMin meet" className="svg-content">
            <rect fill="#053544" width="10" height="400" x="20" y="0" />
            <rect fill="#053544" width="300" height="10" x="20" y="0" />
            <rect fill="#053544" width="300" height="10" x="0" y="400" />
            <line x1="290" y1 = "0" x2="290" y2 = "120" stroke = "rgb(0,0,0)"/>
        </svg>
        );
    }
});
    
var Hangman = React.createClass({
    
// An <SVG /> element. Defines the actual hangman and the scaffolding. Decides whether or not to render the hangman itself. 
    
// Props: 
//        @tries: (type String, to be parsed as Int) Defines the number of attempts the user can still make.
//                Additional elements of the hangman are rendered progressively as this prop changes.

// State: None
    
    // saves re-rendering time when a letter is successful and num_of_tries does not decrement.
    shouldComponentUpdate: function(nextProps,nextState){
      return nextProps.tries !== this.props.tries;
    },
    
    render: function(){
        
        var number_of_tries = parseInt(this.props.tries);
        
        return (
            <div className="svg-container" title="Save the hangman! Prevent the body from being completely drawn. Every wrong letter draws on another limb...">
            <svg version="1.1" viewBox="0 0 500 500" preserveAspectRatio="xMinYMin meet" className="svg-content">
            <HangmanScaffold />
            {number_of_tries <= 4 ? <circle cx="290" cy="150" r="30"/> : null}
            {number_of_tries <= 3 ? <rect width="10" height="100" x="285" y="150" />:null}
            {number_of_tries <= 2 ? <line x1="290" y1="200" x2="260" y2="230" stroke="black" strokeLinecap="round" strokeWidth="10"/>:null}
            {number_of_tries <= 1 ? <line x1="290" y1="200" x2="320" y2="230" stroke="black" strokeLinecap="round" strokeWidth="10"/>:null}
            {number_of_tries <= 0 ? <line x1="290" y1="250" x2="260" y2="300" stroke="black" strokeLinecap="round" strokeWidth="10"/>:null}
            {number_of_tries === -1 ? <line x1="290" y1="250" x2="320" y2="300" strokeLinecap="round" stroke="black" strokeWidth="10"/>:null}
            </svg>
            </div>
        );
    }
});


var Parent = React.createClass({

// Global parent for <Hangman /> and a dedicated <Form /> element. Controller of game state. Sees all, knows all. 
    
// Props: 
//         @ gameState: (type: Object) Returned from hangman.coursera.org/game. Contains 
//                      all informaton about the state of the game. Refer to API documentation 
//                      for explanation of structure. Only invoked as props once on mounting; all changes
//                      happen to the corresponding gameState in state.
//         @ login: (type String) The email to be passed to hangman.coursera.org/game to initiate a new game.
//                  Passed down from component <Login />, hence the name. 

// States:
//         @ gameState: (type: Object) Returned from hangman.coursera.org/game. Contains 
//                      all informaton about the state of the game. Contains info on number of tries left, 
//                      the game phrase, the game key and the status of the game.
//         @ login: (type String) The email to be passed to hangman.coursera.org/game to initiate a new game.
//                  Stored in state so that new games can be initiated without requiring repeat signins.
//
//         @ seenValues: (type Array) A container to keep all successful/unsuccessful character inputs inside to display
//                       to the user. 
//         @ network: (type: Boolean) Indicates whether network connectivity is lost or enabled. Specifies 
//                   different rendering behaviour in either case.
    
    getInitialState: function() {
        // we pre-fill state with props only once after page is loaded. All changes are subsequently made with setState.
        // Since the goal is not synchronisation, this is not an anti-pattern. 
        return {
            gameState: this.props.gameState,
            email: this.props.login,
            seenValues: [],
            network: true
        }
    },
    
    // this function initiates a new game with the user's email (stored in State) once a game is over
    playAgain: function(event){
        var request = JSON.stringify({email: this.state.email});
        var xhr = new XMLHttpRequest();
        xhr.open('POST', <API>, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        var self = this;
        xhr.onerror = function() {
                self.setState({network: false});
        };
        xhr.onload = function () {
            var game_state = JSON.parse(this.responseText);
            self.setState({gameState: game_state,seenValues:[], network:true});
        };
        xhr.send(request);
    },
    
    // this function queries the Hangman server on receipt of character in form submission and updates game state as necessary.
    submit: function(event){
        
        event.preventDefault();
        // the following makes a deep copy of the ref's state at time of invocation, since ordinary assignment creates a reference 
        // to the state and soon after the ref's state's value is reset to null. 
        var character = JSON.parse(JSON.stringify(this.refs["form"].state.value.toLowerCase()));
        
        // the following block requires a check to see if the input character has not already been seen before, and fires off
        // a query if it hasn't. This is fairly cost-effective: since the number of tries is capped at six, the array can store
        // at most twenty values in the worst case, for which a linear search is sufficient.
        
        if (this.state.seenValues.indexOf(character) === -1){
            var request = JSON.stringify({guess: character});
            var xhr = new XMLHttpRequest();
            xhr.open('POST', <API>+this.state.gameState.game_key, true);
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            var self = this;
            xhr.onerror = function() {
                self.setState({network: false});
            };
            xhr.onload = function () {
                var game_state = JSON.parse(this.responseText);
                self.setState({gameState: game_state,
                               seenValues: self.state.seenValues.concat([character]), network:true});
            };
            xhr.send(request);
        }
        
    },
    
    // handle user interaction
    render: function(){
        
        var number_of_tries = parseInt(this.state.gameState.num_tries_left);
            return (
                <div>
                <div className="six columns">
                    <Hangman tries = {this.state.gameState.num_tries_left} />
                </div>
                <div className="six columns">
                    <h4>Guess the words below:</h4>
            
                    <h4 className="wrap"> {this.state.gameState.phrase} </h4>
            
                    {this.state.gameState.state === "alive" ? <p> You have {number_of_tries + 1} {number_of_tries === 0? "try" : "tries"} left. You have already tried: <b>{this.state.seenValues? this.state.seenValues.join(", "): null}</b></p> : null}
  
                    {this.state.gameState.state === "won" ? <p><b>Congratulations!</b> You won.</p> : null}
  
                    {this.state.gameState.state === "lost" ? <p>Unfortunately, you've lost. You tried <b>{this.state.seenValues.join(", ")}</b>. Maybe another round will help?</p> : null}
                    {this.state.network === false? <p><i> Unfortunately, network connectivity issues are preventing your input from being sent. Please check your network and try entering input again. </i></p> : null }
                    {this.state.gameState.state === "alive"? <Form ref="form" submit={this.submit.bind(this)} /> : <button onClick={this.playAgain} className="button-primary">Play Again?</button>}
                </div>
                </div>
            
        );
   }
});

ReactDOM.render(
    <Login />,
    document.getElementById('login_form')
);
})();