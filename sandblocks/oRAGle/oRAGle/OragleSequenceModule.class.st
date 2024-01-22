Class {
	#name : #OragleSequenceModule,
	#superclass : #OragleModule,
	#instVars : [
		'separator'
	],
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:06'
}
OragleSequenceModule >> accept: aVisitor [

	^ aVisitor visitSequenceModule: self.
]

{
	#category : #defaults,
	#'squeak_changestamp' : 'ct 1/22/2024 16:24'
}
OragleSequenceModule >> defaultSeparator [
	^ String cr
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 1/22/2024 11:47'
}
OragleSequenceModule >> initialize [
	
	super initialize.
	
	separator := self defaultSeparator.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:46'
}
OragleSequenceModule >> separator [

	^ separator
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:48'
}
OragleSequenceModule >> separator: aString [

	separator := aString.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:10'
}
OragleSequenceModule >> type [

	^ #sequence
]
