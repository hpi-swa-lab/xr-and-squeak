Class {
	#name : #OragleVisitor,
	#superclass : #Object,
	#instVars : [
		'rootModule'
	],
	#category : #oRAGle
}

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'lubo 1/20/2024 01:54'
}
OragleVisitor class >> rootModule: aModule [

	|visitor|
	visitor := self new.
	visitor rootModule: aModule.
	
	^ visitor
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:35'
}
OragleVisitor >> rootModule [

	^ rootModule
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:47'
}
OragleVisitor >> rootModule: aModule [

	rootModule := aModule.
]

{
	#category : #execute,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:48'
}
OragleVisitor >> value [

	self subclassResponsibility.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/22/2024 15:51'
}
OragleVisitor >> visit: aModule [

	^ aModule children collect: [:child | child accept: self]
	
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:15'
}
OragleVisitor >> visitAlternation: aModule [

	^ self subclassResponsibility.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:14'
}
OragleVisitor >> visitLeafModule: aModule [

	^ self subclassResponsibility.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:15'
}
OragleVisitor >> visitScriptModule: aModule [

	^ self subclassResponsibility.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:15'
}
OragleVisitor >> visitSequenceModule: aModule [

	^ self subclassResponsibility.
]
