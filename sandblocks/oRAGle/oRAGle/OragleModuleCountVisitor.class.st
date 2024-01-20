Class {
	#name : #OragleModuleCountVisitor,
	#superclass : #OragleVisitor,
	#instVars : [
		'counts'
	],
	#category : #oRAGle
}

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'lubo 1/19/2024 21:45'
}
OragleModuleCountVisitor >> initialize [

	counts := Dictionary new.
]

{
	#category : #execute,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:55'
}
OragleModuleCountVisitor >> value [

	rootModule accept: self.
	
	^ counts
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:44'
}
OragleModuleCountVisitor >> visit: aModule [

	counts at: aModule class
		ifPresent: [:count | counts at: aModule class put: count + 1]
		ifAbsent: [counts at: aModule class put: 1].
		
	aModule children do: [:child | child accept: self]
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 21:43'
}
OragleModuleCountVisitor >> visitAlternation: aModule [

	self visit: aModule.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 21:44'
}
OragleModuleCountVisitor >> visitLeafModule: aModule [

	self visit: aModule.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 21:44'
}
OragleModuleCountVisitor >> visitSequenceModule: aModule [

	self visit: aModule.
]
