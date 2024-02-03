Class {
	#name : #OragleLeafModule,
	#superclass : #OragleModule,
	#instVars : [
		'content'
	],
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:05'
}
OragleLeafModule >> accept: aVisitor [

	^ aVisitor visitLeafModule: self.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:23'
}
OragleLeafModule >> content [

	^ content
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 21:53'
}
OragleLeafModule >> content: aString [

	content := aString asString.
]

{
	#category : #printing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:11'
}
OragleLeafModule >> printContentOn: aStream [

	aStream print: self content.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:10'
}
OragleLeafModule >> type [

	^ #leaf
]
