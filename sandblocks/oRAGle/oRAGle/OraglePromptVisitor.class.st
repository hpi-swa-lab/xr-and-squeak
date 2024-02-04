Class {
	#name : #OraglePromptVisitor,
	#superclass : #OragleVisitor,
	#category : #oRAGle
}

{
	#category : #execute,
	#'squeak_changestamp' : 'ct 1/22/2024 15:52'
}
OraglePromptVisitor >> value [

	^ rootModule accept: self
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 2/3/2024 23:37'
}
OraglePromptVisitor >> visit: aModule [

	^ self shouldNotImplement
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/22/2024 15:57'
}
OraglePromptVisitor >> visitAlternation: aModule [

	^ aModule enabledChildren gather: [:child |
		child accept: self]
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/22/2024 16:08'
}
OraglePromptVisitor >> visitLeafModule: aModule [

	^ {OraglePrompt with: aModule}
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/22/2024 16:07'
}
OraglePromptVisitor >> visitSequenceModule: aModule [

	^ aModule enabledChildren
		inject: {OraglePrompt new}
		into: [:promptPrefixes :child |
			(child accept: self) gather: [:newPrompt |
				promptPrefixes collect: [:promptPrefix |
					promptPrefix copyWith: newPrompt separator: aModule separator]]]
]
