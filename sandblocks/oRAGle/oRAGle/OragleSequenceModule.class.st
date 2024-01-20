Class {
	#name : #OragleSequenceModule,
	#superclass : #OragleModule,
	#instVars : [
		'seperator'
	],
	#category : #oRAGle
}

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/19/2024 19:06'
}
OragleSequenceModule >> accept: aVisitor [

	^ aVisitor visitSequenceModule: self.
]

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/19/2024 17:21'
}
OragleSequenceModule >> defaultSeperator [
	^ String cr String cr.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:21'
}
OragleSequenceModule >> seperator [

	^ seperator
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:21'
}
OragleSequenceModule >> seperator: anObject [

	seperator := anObject.
]
