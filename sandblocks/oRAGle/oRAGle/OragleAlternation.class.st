Class {
	#name : #OragleAlternation,
	#superclass : #OragleModule,
	#category : #oRAGle
}

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/19/2024 19:04'
}
OragleAlternation >> accept: aVisitor [

	^ aVisitor visitAlternation: self.
]

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/19/2024 18:29'
}
OragleAlternation >> expand [

	^ children gather: [:child | child expand ]
]
