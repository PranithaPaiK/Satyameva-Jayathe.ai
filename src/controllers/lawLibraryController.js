const { logger } = require('../utils/logger');
const LawLibrary = require('../models/LawLibrary');
const elasticlunr = require('elasticlunr');

/**
 * Law Library Controller
 * Handles searchable law database with acts, sections, and legal descriptions
 */
class LawLibraryController {
  constructor() {
    this.searchIndex = null;
    this.initializeSearchIndex();
  }

  /**
   * Initialize search index for fast search
   */
  async initializeSearchIndex() {
    try {
      this.searchIndex = elasticlunr(function() {
        this.addField('title');
        this.addField('content');
        this.addField('keywords');
        this.addField('category');
        this.addField('actName');
        this.setRef('id');
      });

      // Load all documents into index
      const laws = await LawLibrary.find({});
      laws.forEach(law => {
        this.searchIndex.addDoc({
          id: law._id.toString(),
          title: law.title,
          content: law.content,
          keywords: law.keywords.join(' '),
          category: law.category,
          actName: law.actName
        });
      });

      logger.info('Law library search index initialized');
    } catch (error) {
      logger.error('Error initializing search index:', error);
    }
  }

  /**
   * Search laws by keyword
   */
  async searchLaws(req, res) {
    try {
      const { q, category, act, page = 1, limit = 20, sortBy = 'relevance' } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long',
          code: 'INVALID_QUERY'
        });
      }

      let searchResults = [];

      if (this.searchIndex) {
        // Use indexed search for better performance
        const results = this.searchIndex.search(q, {
          fields: {
            title: { boost: 2 },
            keywords: { boost: 1.5 },
            content: { boost: 1 },
            category: { boost: 1.2 },
            actName: { boost: 1.3 }
          }
        });

        const lawIds = results.map(result => result.ref);
        const laws = await LawLibrary.find({ _id: { $in: lawIds } });
        
        // Sort by relevance score
        const lawMap = {};
        laws.forEach(law => {
          lawMap[law._id.toString()] = law;
        });

        searchResults = results.map(result => ({
          ...lawMap[result.ref].toObject(),
          score: result.score,
          highlights: this.generateHighlights(lawMap[result.ref], q)
        }));
      } else {
        // Fallback to database search
        let searchQuery = {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } },
            { keywords: { $in: [new RegExp(q, 'i')] } },
            { actName: { $regex: q, $options: 'i' } }
          ]
        };

        if (category) searchQuery.category = category;
        if (act) searchQuery.actName = new RegExp(act, 'i');

        searchResults = await LawLibrary.find(searchQuery)
          .sort({ 'metadata.lastUpdated': -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      }

      // Apply additional filters
      if (category) {
        searchResults = searchResults.filter(law => law.category === category);
      }
      if (act) {
        searchResults = searchResults.filter(law => 
          law.actName.toLowerCase().includes(act.toLowerCase())
        );
      }

      // Sort results
      if (sortBy === 'relevance') {
        searchResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortBy === 'recent') {
        searchResults.sort((a, b) => 
          new Date(b.metadata.lastUpdated) - new Date(a.metadata.lastUpdated)
        );
      } else if (sortBy === 'alphabetical') {
        searchResults.sort((a, b) => a.title.localeCompare(b.title));
      }

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedResults = searchResults.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          laws: paginatedResults,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(searchResults.length / limit),
            total: searchResults.length
          },
          query: q,
          filters: { category, act }
        }
      });
    } catch (error) {
      logger.error('Error searching laws:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search laws',
        error: error.message
      });
    }
  }

  /**
   * Get law by ID
   */
  async getLaw(req, res) {
    try {
      const { lawId } = req.params;

      const law = await LawLibrary.findById(lawId)
        .populate('relatedLaws', 'title sectionNumber actName');

      if (!law) {
        return res.status(404).json({
          success: false,
          message: 'Law not found',
          code: 'LAW_NOT_FOUND'
        });
      }

      // Generate simplified explanation for common users
      const simplifiedExplanation = this.generateSimplifiedExplanation(law);

      res.json({
        success: true,
        data: {
          ...law.toObject(),
          simplifiedExplanation
        }
      });
    } catch (error) {
      logger.error('Error getting law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch law',
        error: error.message
      });
    }
  }

  /**
   * Get laws by category
   */
  async getLawsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20, act } = req.query;

      let filter = { category };
      if (act) filter.actName = new RegExp(act, 'i');

      const laws = await LawLibrary.find(filter)
        .sort({ 'sectionNumber': 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await LawLibrary.countDocuments(filter);

      // Get unique acts in this category
      const acts = await LawLibrary.distinct('actName', { category });

      res.json({
        success: true,
        data: {
          laws,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          },
          acts
        }
      });
    } catch (error) {
      logger.error('Error getting laws by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch laws',
        error: error.message
      });
    }
  }

  /**
   * Get all categories
   */
  async getCategories(req, res) {
    try {
      const categories = await LawLibrary.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            acts: { $addToSet: '$actName' }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            acts: 1,
            _id: 0
          }
        },
        {
          $sort: { category: 1 }
        }
      ]);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  /**
   * Get acts by category
   */
  async getActsByCategory(req, res) {
    try {
      const { category } = req.params;

      const acts = await LawLibrary.aggregate([
        { $match: { category } },
        {
          $group: {
            _id: '$actName',
            sections: { $sum: 1 },
            firstSection: { $min: '$sectionNumber' },
            lastSection: { $max: '$sectionNumber' },
            description: { $first: '$actDescription' }
          }
        },
        {
          $project: {
            actName: '$_id',
            sections: 1,
            firstSection: 1,
            lastSection: 1,
            description: 1,
            _id: 0
          }
        },
        {
          $sort: { actName: 1 }
        }
      ]);

      res.json({
        success: true,
        data: acts
      });
    } catch (error) {
      logger.error('Error getting acts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch acts',
        error: error.message
      });
    }
  }

  /**
   * Get sections of an act
   */
  async getActSections(req, res) {
    try {
      const { actName } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const sections = await LawLibrary.find({ 
        actName: new RegExp(actName, 'i') 
      })
      .sort({ 'sectionNumber': 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await LawLibrary.countDocuments({ 
        actName: new RegExp(actName, 'i') 
      });

      res.json({
        success: true,
        data: {
          sections,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      logger.error('Error getting act sections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch act sections',
        error: error.message
      });
    }
  }

  /**
   * Get related laws
   */
  async getRelatedLaws(req, res) {
    try {
      const { lawId } = req.params;

      const law = await LawLibrary.findById(lawId);
      if (!law) {
        return res.status(404).json({
          success: false,
          message: 'Law not found',
          code: 'LAW_NOT_FOUND'
        });
      }

      // Find related laws based on keywords and category
      const relatedLaws = await LawLibrary.find({
        _id: { $ne: lawId },
        $or: [
          { category: law.category },
          { keywords: { $in: law.keywords } },
          { actName: law.actName }
        ]
      })
      .limit(10)
      .sort({ 'metadata.viewCount': -1 });

      res.json({
        success: true,
        data: relatedLaws
      });
    } catch (error) {
      logger.error('Error getting related laws:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch related laws',
        error: error.message
      });
    }
  }

  /**
   * Get popular/recently viewed laws
   */
  async getPopularLaws(req, res) {
    try {
      const { limit = 20, period = 'month' } = req.query;

      let dateFilter = {};
      if (period === 'week') {
        dateFilter = { 'metadata.lastViewed': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
      } else if (period === 'month') {
        dateFilter = { 'metadata.lastViewed': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
      }

      const popularLaws = await LawLibrary.find(dateFilter)
        .sort({ 'metadata.viewCount': -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: popularLaws
      });
    } catch (error) {
      logger.error('Error getting popular laws:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular laws',
        error: error.message
      });
    }
  }

  /**
   * Helper methods
   */
  generateHighlights(law, query) {
    const highlights = [];
    const queryLower = query.toLowerCase();
    
    // Highlight in title
    if (law.title.toLowerCase().includes(queryLower)) {
      highlights.push({
        field: 'title',
        snippet: this.highlightText(law.title, query)
      });
    }
    
    // Highlight in content
    const contentLower = law.content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(law.content.length, queryIndex + query.length + 50);
      const snippet = law.content.substring(start, end);
      highlights.push({
        field: 'content',
        snippet: '...' + this.highlightText(snippet, query) + '...'
      });
    }
    
    return highlights;
  }

  highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  generateSimplifiedExplanation(law) {
    // This is a simplified implementation
    // In production, you might use AI/ML to generate better explanations
    
    const simplifiedTemplates = {
      'criminal': 'This criminal law section defines legal consequences for specific actions and helps maintain public order.',
      'civil': 'This civil law section governs disputes between individuals or organizations and provides remedies for legal wrongs.',
      'family': 'This family law section addresses matters related to marriage, divorce, child custody, and family relationships.',
      'property': 'This property law section defines rights and responsibilities related to ownership, transfer, and use of property.',
      'tax': 'This tax law section specifies tax obligations and procedures for individuals and businesses.',
      'labour': 'This labour law section protects workers\' rights and regulates employer-employee relationships.',
      'constitutional': 'This constitutional law section defines fundamental rights and the structure of government.',
      'corporate': 'This corporate law section governs the formation, operation, and regulation of companies and businesses.'
    };

    const baseExplanation = simplifiedTemplates[law.category] || 
      'This legal provision establishes rules and regulations that help maintain order and justice in society.';
    
    return `${baseExplanation} Section ${law.sectionNumber} of the ${law.actName} specifically addresses: ${law.title.substring(0, 100)}...`;
  }

  /**
   * Update view count (for analytics)
   */
  async updateViewCount(req, res) {
    try {
      const { lawId } = req.params;

      await LawLibrary.findByIdAndUpdate(lawId, {
        $inc: { 'metadata.viewCount': 1 },
        $set: { 'metadata.lastViewed': new Date() }
      });

      res.json({
        success: true,
        message: 'View count updated'
      });
    } catch (error) {
      logger.error('Error updating view count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update view count',
        error: error.message
      });
    }
  }
}

module.exports = new LawLibraryController();
