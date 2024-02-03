Class {
	#name : #OraglePrompt,
	#superclass : #Object,
	#instVars : [
		'modules',
		'input',
		'replies',
		'approvedPrice'
	],
	#category : #oRAGle
}

{
	#category : #'instance creation',
	#'squeak_changestamp' : 'ct 1/22/2024 16:09'
}
OraglePrompt class >> with: aModule [
 
	^ self new
		add: aModule;
		yourself
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:13'
}
OraglePrompt >> add: aModule [

	modules add: aModule.
	input := input , aModule content.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:12'
}
OraglePrompt >> add: aPrompt separator: aString [

	modules addAll: aPrompt modules.
	input := input , aString , aPrompt input.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/26/2024 22:07'
}
OraglePrompt >> approvedPrice [

	^ approvedPrice
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/26/2024 22:07'
}
OraglePrompt >> approvedPrice: cents [

	approvedPrice := cents.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:36'
}
OraglePrompt >> assureOutputs [

	self outputs ifNil: [self generateOutputs].
	^ self outputs
]

{
	#category : #copying,
	#'squeak_changestamp' : 'ct 1/22/2024 16:08'
}
OraglePrompt >> copyWith: aModule separator: aString [

	^ self copy
		add: aModule separator: aString;
		yourself
]

{
	#category : #defaults,
	#'squeak_changestamp' : 'ct 1/22/2024 16:50'
}
OraglePrompt >> defaultMaxNumberOfTokens [

	^ 100
]

{
	#category : #defaults,
	#'squeak_changestamp' : 'ct 1/22/2024 16:37'
}
OraglePrompt >> defaultNumberOfOutputs [

	^ 1
]

{
	#category : #private,
	#'squeak_changestamp' : 'ct 2/3/2024 18:40'
}
OraglePrompt >> generateOutputs [

	approvedPrice ifNotNil:
		[| price |
		(price := self priceToGenerateOutputs maxCents) > approvedPrice ifTrue:
			[self notify: ('about to spend {1}' format: {price})].
		approvedPrice := 0].
	replies := SemanticConversation new
		addUserMessage: input;
		withConfigDo: [:config |
			config maxTokens: self defaultMaxNumberOfTokens];
		getAssistantMessages: self defaultNumberOfOutputs.
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 1/26/2024 21:59'
}
OraglePrompt >> initialize [

	super initialize.
	
	modules := OrderedCollection new.
	input := String new.
	approvedPrice := 0.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:11'
}
OraglePrompt >> input [

	^ input
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:11'
}
OraglePrompt >> modules [

	^ modules
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 16:38'
}
OraglePrompt >> outputs [

	^ (replies ifNil: [^ nil]) collect: #content
]

{
	#category : #copying,
	#'squeak_changestamp' : 'ct 1/22/2024 16:02'
}
OraglePrompt >> postCopy [

	super postCopy.
	
	modules := modules copy.
]

{
	#category : #private,
	#'squeak_changestamp' : 'ct 1/22/2024 16:51'
}
OraglePrompt >> priceToGenerateOutputs [

	^ (SemanticConversation new
		addUserMessage: input;
		withConfigDo: [:config |
			config maxTokens: self defaultMaxNumberOfTokens];
		estimatePriceToGetAssistantMessage)
			* self defaultNumberOfOutputs
]

{
	#category : #comparing,
	#'squeak_changestamp' : 'ct 2/3/2024 18:15'
}
OraglePrompt >> promptKey [

	^ self input
]
