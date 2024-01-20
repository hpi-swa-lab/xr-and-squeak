Class {
	#name : #OragleScriptModule,
	#superclass : #OragleModule,
	#category : #oRAGle
}

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/19/2024 19:06'
}
OragleScriptModule >> accept: aVisitor [

	^ aVisitor visitScriptModule: self.
]
