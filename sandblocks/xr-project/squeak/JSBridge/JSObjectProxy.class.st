"
A JSObjectProxy is a proxy for JavaScript objects. It intercepts messages to look up named properties, and call them if they are functions. Arguments are converted from Squeak to JavaScript objects for nil, Booleans, SmallIntegers, Floats, Strings, Arrays, and Dictionaries. The result is converted back to Squeak objects for numbers and null/true/false, otherwise wrapped in a new JSObjectProxy. To add new properties, or access existing properties without calling them (if they are functions), use at:/at:put:. In addition, sending #new/#new:... creates an instance of that object, and #typeof returns the type as a string. There is a global proxy named JS to allow accessing global JavaScript objects.

""Call global function""
JS alert: 'Squeak says Hello World!'.

""Call function on global object (open console to see result)""
JS console log: 'Squeak says Hello World!'.

""Modify DOM""
((JS document getElementsByTagName: 'h1') at: 0)
	at: 'innerHTML' put: 'Squeak said Hello World at ', Time now asString.

""Create new Object, add properties and a method, retrieve property, call method""
| obj |
obj := JS Object new.
obj at: #someProp put: 42.
obj at: #complexProp put: {#a -> 3. #b -> 4}.
obj at: #someMethod put: (JS Function new: 'return this.complexProp.a + this.complexProp.b').
{obj someProp. obj complexProp. obj someMethod}

""Inspect all properties in global window object""
| object propNames propValues |
object := JS window.
propNames := JS Object keys: object.
propValues := (0 to: propNames length - 1) collect: [:i |
	(propNames at: i) -> (object at: (propNames at: i))].
(propValues as: Dictionary) inspect

""A Squeak block becomes a JavaScript function""
JS at: #sqPlus put: [:arg0 :arg1 |
	Transcript show: 'sqPlus called with ', arg0 asString, ' and ', arg1 asString; cr.
	arg0 + arg1].

""It can be called from JavaScript (open transcript to see)""
JS eval: 'sqPlus(3, 4)'.

""It returns a Promise. When resolved, you can access the result""
JS eval: 'sqPlus(3, 4).then(function(result) { 
	console.log(result);
})'.

""Which even works from Squeak ...""
(JS sqPlus: 3 and: 4) then: [:result | JS alert: result].

""But instead of using JavaScript's then() function, you can use Smalltalk's semaphores!""
JS await: (JS sqPlus: 3 and: 4).

""If you don't need a result, just ignore the Promise""
JS setTimeout: [JS alert: 'Hi'] ms: 1000.

""Now for some fun: Load jQuery, and compile a helper method""
| script |
(JS at: #jQuery) ifNil: [
	script := JS document createElement: 'SCRIPT'.
	script at: 'src' put: 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js'.
	script at: 'type' put: 'text/javascript'.
	((JS document getElementsByTagName: 'head') at: 0) appendChild: script.
].
String compile: 'asJQuery ^JS jQuery: self' classified: '*mystuff' notifying: nil.

""Use jQuery""
'canvas' asJQuery hide: 'slow'; show: 'fast'.

'h1' asJQuery css: {'color'->'red'. 'text-shadow' -> '0 2px white, 0 3px #777'}.

'<button>' asJQuery text: 'Hi'; click: [Transcript show: 'hi'; cr]; appendTo: 'h1'.

"
Class {
	#name : #JSObjectProxy,
	#superclass : #Object,
	#classVars : [
		'CallbackProcess',
		'CallbackSemaphore'
	],
	#category : #'JSBridge-Core'
}

{ #category : #callbacks }
JSObjectProxy class >> callSemaphore [

	^ self callSemaphoreInfo first
	
]

{ #category : #callbacks }
JSObjectProxy class >> callSemaphoreIndex [

	^ self callSemaphoreInfo second
	
]

{ #category : #callbacks }
JSObjectProxy class >> callSemaphoreInfo [

	^ JSCallSemaphore value ifNil: [ | sema semaIndex |
		sema := Semaphore new.
		semaIndex := Smalltalk registerExternalObject: sema.
		"JSResourceCleaner instance trackExternalObject: semaIndex ofProcess: Processor activeProcess."
		JSCallSemaphore value: {sema. semaIndex}]
]

{ #category : #callbacks }
JSObjectProxy class >> callbackProcess [
	[true] whileTrue: [
		CallbackSemaphore wait.
		[self handleCallback] fork].

]

{ #category : #callbacks }
JSObjectProxy class >> cleanupCallSemaphore [

	JSCallSemaphore value ifNotNil: [:semaInfo |
		Smalltalk unregisterExternalObject: semaInfo first]
]

{ #category : #callbacks }
JSObjectProxy class >> continueHandlingCallback: aBlock [
	"Use this if the previous handler process was terminated before it was finished."
	| result |
	[[result := aBlock value]
		ifError: [:err :rcvr | result := JS Error: err asString].
	self primReturnFromCallback: result]
		ensure: [
			self cleanupCallSemaphore]
]

{ #category : #'class initialization' }
JSObjectProxy class >> examples [
	| comment |
	"Create symbols in advance"
	('sqPlus:and: alert: console log: document getElementsByTagName: navigator Object keys: Function length eval: then: setTimeout:ms: createElement: appendChild: jQuery: hide: show: css: click: appendTo:'
		findTokens: ' ') do: [:s | s asSymbol].
	comment := self organization classComment asString.
	^ comment copyFrom: (comment indexOf: $") to: comment size.

]

{ #category : #callbacks }
JSObjectProxy class >> handleCallback [
	| block args result |
	block := self primGetActiveCallbackBlock.
	args := self primGetActiveCallbackArgs.
	[result := block valueWithArguments: args]
		ifError: [:err :rcvr | result := JS Error: err asString].
	self primReturnFromCallback: result.
	self cleanupCallSemaphore.
]

{ #category : #callbacks }
JSObjectProxy class >> initCallbacks [
	CallbackProcess ifNotNil: [CallbackProcess terminate. CallbackProcess := nil].
	CallbackSemaphore := Semaphore new.
	self primInitCallbacks: (Smalltalk registerExternalObject: CallbackSemaphore).
	CallbackProcess := [self callbackProcess] newProcess
		priority: Processor lowIOPriority; resume.

]

{ #category : #'class initialization' }
JSObjectProxy class >> initialize [
	"Create the JS global"
	Smalltalk at: #JS put: self basicNew.
	"If we have the plugin, show workspace"
	[JS window] ifError: [:err :rcvr | ^self].
	Smalltalk isMorphic
		ifTrue: [self openExamples]
		ifFalse: [[self openExamples] fork].

]

{ #category : #'instance creation' }
JSObjectProxy class >> new [
	self error: 'Use "JS Object new" to create a new JavaScript object'.

]

{ #category : #'class initialization' }
JSObjectProxy class >> openExamples [
	Workspace new
		contents: 'Besides running regular Squeak images, SqueakJS can directly use JavaScript. It can interact with the DOM, access JavaScript libraries, and use Smalltalk code to create an interactive HTML interface. Try these examples:

', self examples;
		openLabel: 'JSBridge'.

]

{ #category : #callbacks }
JSObjectProxy class >> primGetActiveCallbackArgs [
	<primitive: 117> #(JavaScriptPlugin primitiveGetActiveCallbackArgs 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #callbacks }
JSObjectProxy class >> primGetActiveCallbackBlock [
	<primitive: 117> #(JavaScriptPlugin primitiveGetActiveCallbackBlock 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #callbacks }
JSObjectProxy class >> primInitCallbacks: semaIndex [
	<primitive: 117> #(JavaScriptPlugin primitiveInitCallbacks 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #callbacks }
JSObjectProxy class >> primReturnFromCallback: returnValue [
	<primitive: 117> #(JavaScriptPlugin primitiveReturnFromCallback 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #promises }
JSObjectProxy >> asCollection [

	self assert: (JS Array isArray: self) description: 'asCollection is only implented for Arrays for now'.
	^ JSArrayWrapper from: self
]

{ #category : #accessing }
JSObjectProxy >> asJSArgument [
	^ self

]

{ #category : #accessing }
JSObjectProxy >> asString [
	"Convert me to a string"
	<primitive: 117> #(JavaScriptPlugin primitiveAsString 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #accessing }
JSObjectProxy >> at: aKey [
	"get a property"
	| error |
	<primitive: 117> #(JavaScriptPlugin primitiveAt 0 0) at: 1.
	(error := self primGetError)
		ifNotNil: [^ self error: error].
	^ self primitiveFailed

]

{ #category : #accessing }
JSObjectProxy >> at: aKey put: aValue [
	"set a property"
	| error |
	<primitive: 117> #(JavaScriptPlugin primitiveAtPut 0 0) at: 1.
	^ self with: aValue retry: [:val | self at: aKey put: val]

]

{ #category : #promises }
JSObjectProxy >> await: promise [
	"Pause the current process until promise returns, signal an exception if the promise was rejected"
	| sem result isError |
	isError := false.
	sem := Semaphore new.
	promise
		then: [:value |
			result := value.
			sem signal];
		catch: [:error |
			result := error.
			isError := true.
			sem signal].
	sem wait.
	isError ifTrue: [JSException error: result].
	^result
]

{ #category : #calling }
JSObjectProxy >> callIntoJS: aMessage [
	
	self primCallIntoJS: aMessage semaphore: self class callSemaphoreIndex

]

{ #category : #'manual overrides' }
JSObjectProxy >> clone [

	self doesNotUnderstand: (Message selector: #clone)
]

{ #category : #accessing }
JSObjectProxy >> doesNotUnderstand: aMessage [

	self callIntoJS: aMessage.
	self waitForCall.
	^ self primGetCallResult
]

{ #category : #calling }
JSObjectProxy >> primCallIntoJS: aMessage semaphore: aSemaphoreIndex [
	"Call a function, or get/set an existing property. The function name / property name is the message selector up to the first colon. If the function name is 'new', create a new instance and call the constructor with args."
	<primitive: 117> #(JavaScriptPlugin primitiveDoUnderstand2 0 0) at: 1.
	^self with: aMessage arguments retry: [:args |
		self primCallIntoJS: (Message selector: aMessage selector arguments: args)
			semaphore: aSemaphoreIndex]

]

{ #category : #calling }
JSObjectProxy >> primGetCallResult [

	<primitive: 117> #(JavaScriptPlugin primitiveGetCallResult 0 0) at: 1.
	self primitiveFailed
]

{ #category : #private }
JSObjectProxy >> primGetError [
	<primitive: 117> #(JavaScriptPlugin primitiveGetError 0 0) at: 1.
	^ nil

]

{ #category : #private }
JSObjectProxy >> primSqueakAsJSObject: anObject [
	<primitive: 117> #(JavaScriptPlugin primitiveSqueakAsJSObject 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #accessing }
JSObjectProxy >> printOn: aStream [
	[aStream nextPutAll: self asString]
		ifError: [:err :rcvr | ^ super printOn: aStream].

]

{ #category : #accessing }
JSObjectProxy >> typeof [
	"Answer my jsObject's type (a string)"
	<primitive: 117> #(JavaScriptPlugin primitiveTypeof 0 0) at: 1.
	^ self primitiveFailed

]

{ #category : #calling }
JSObjectProxy >> waitForCall [

	self class callSemaphore wait.
]

{ #category : #private }
JSObjectProxy >> with: argument retry: retryBlock [
	| error |
	(error := self primGetError) ifNil: [^ self error: 'JSBridge error'].
	(error beginsWith: 'asJSArgument') ifTrue: [
		^retryBlock value: argument asJSArgument].
	(error beginsWith: 'CallbackSemaphore') ifTrue: [
		self class initCallbacks.
		^retryBlock value: argument].
	self error: error.

]
