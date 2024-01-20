Class {
	#name : #OraglePromptVisitor,
	#superclass : #OragleVisitor,
	#instVars : [
		'alternationChildIndex',
		'currentPrompt'
	],
	#category : #oRAGle
}

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'lubo 1/20/2024 02:01'
}
OraglePromptVisitor >> initialize [

	alternationChildIndex := Dictionary new.
	currentPrompt := OrderedCollection new.
]

{
	#category : #execute,
	#'squeak_changestamp' : 'lubo 1/20/2024 02:02'
}
OraglePromptVisitor >> value [
	
	| numPrompts prompts |
	
	numPrompts := (OraglePromptCountVisitor rootModule: rootModule) value.
	
	prompts := OrderedCollection new.
	1 to: numPrompts do: [:index |
		rootModule accept: self.
		
		prompts add: currentPrompt.
		currentPrompt := OrderedCollection new.
	].

	^ prompts
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 02:00'
}
OraglePromptVisitor >> visitAlternation: aModule [

	| calculatedIndex |

	alternationChildIndex at: aModule
		ifPresent: [:index | alternationChildIndex at: aModule put: index + 1]
		ifAbsentPut: 1.
		
	calculatedIndex := ((alternationChildIndex at: aModule) \\ aModule children size) + 1.
	(aModule children at: calculatedIndex) accept: self.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 02:02'
}
OraglePromptVisitor >> visitLeafModule: aModule [

	currentPrompt add: aModule.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:15'
}
OraglePromptVisitor >> visitSequenceModule: aModule [

	self visit: aModule.
]
