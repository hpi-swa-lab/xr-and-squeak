Class {
	#name : #OragleScriptModule,
	#superclass : #OragleModule,
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:06'
}
OragleScriptModule >> accept: aVisitor [

	^ aVisitor visitScriptModule: self.
]
