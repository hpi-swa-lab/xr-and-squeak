Class {
	#name : #OragleAlternation,
	#superclass : #OragleModule,
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:04'
}
OragleAlternation >> accept: aVisitor [

	^ aVisitor visitAlternation: self.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 18:29'
}
OragleAlternation >> expand [

	^ children gather: [:child | child expand ]
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:10'
}
OragleAlternation >> type [

	^ #alternation
]
