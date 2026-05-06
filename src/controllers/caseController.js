const Case = require('../models/Case');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { generateCaseId } = require('../utils/helpers');

/**
 * Case Controller
 * Handles all case-related operations
 */
class CaseController {
  /**
   * Get dashboard statistics for a user
   */
  async getDashboardStats(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let stats = {};
      
      if (userRole === 'judge') {
        stats = await this.getJudgeDashboardStats(userId);
      } else if (userRole === 'lawyer') {
        stats = await this.getLawyerDashboardStats(userId);
      } else if (userRole === 'citizen') {
        stats = await this.getCitizenDashboardStats(userId);
      } else if (userRole === 'admin') {
        stats = await this.getAdminDashboardStats();
      }
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message
      });
    }
  }

  /**
   * Get judge dashboard statistics
   */
  async getJudgeDashboardStats(judgeId) {
    const pendingCases = await Case.countDocuments({ 
      assignedJudge: judgeId, 
      status: { $in: ['filed', 'under_review', 'admitted'] }
    });
    
    const activeCases = await Case.countDocuments({ 
      assignedJudge: judgeId, 
      status: { $in: ['active', 'adjourned', 'pending_judgment'] }
    });
    
    const resolvedCases = await Case.countDocuments({ 
      assignedJudge: judgeId, 
      status: { $in: ['closed', 'dismissed'] }
    });
    
    const todayHearings = await Case.countDocuments({
      assignedJudge: judgeId,
      'nextHearing.date': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    const overdueCases = await Case.countDocuments({
      assignedJudge: judgeId,
      expectedResolutionDate: { $lt: new Date() },
      status: { $nin: ['closed', 'dismissed'] }
    });

    return {
      pendingCases,
      activeCases,
      resolvedCases,
      todayHearings,
      overdueCases,
      totalCases: pendingCases + activeCases + resolvedCases
    };
  }

  /**
   * Get lawyer dashboard statistics
   */
  async getLawyerDashboardStats(lawyerId) {
    const myCases = await Case.find({
      $or: [
        { 'plaintiff.lawyerId': lawyerId },
        { 'defendant.lawyerId': lawyerId }
      ]
    });

    const pendingCases = myCases.filter(c => ['filed', 'under_review', 'admitted'].includes(c.status)).length;
    const activeCases = myCases.filter(c => ['active', 'adjourned', 'pending_judgment'].includes(c.status)).length;
    const resolvedCases = myCases.filter(c => ['closed', 'dismissed'].includes(c.status)).length;
    
    const upcomingHearings = myCases.filter(c => {
      if (c.nextHearing && c.nextHearing.date) {
        return new Date(c.nextHearing.date) > new Date();
      }
      return false;
    }).length;

    return {
      pendingCases,
      activeCases,
      resolvedCases,
      upcomingHearings,
      totalCases: myCases.length
    };
  }

  /**
   * Get citizen dashboard statistics
   */
  async getCitizenDashboardStats(citizenId) {
    const user = await User.findById(citizenId);
    
    // Find cases where citizen is plaintiff or defendant
    const myCases = await Case.find({
      $or: [
        { 'plaintiff.contact.email': user.email },
        { 'defendant.contact.email': user.email }
      ]
    });

    const pendingCases = myCases.filter(c => ['filed', 'under_review', 'admitted'].includes(c.status)).length;
    const activeCases = myCases.filter(c => ['active', 'adjourned', 'pending_judgment'].includes(c.status)).length;
    const resolvedCases = myCases.filter(c => ['closed', 'dismissed'].includes(c.status)).length;

    return {
      pendingCases,
      activeCases,
      resolvedCases,
      totalCases: myCases.length
    };
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboardStats() {
    const totalCases = await Case.countDocuments();
    const pendingCases = await Case.countDocuments({ 
      status: { $in: ['filed', 'under_review', 'admitted'] }
    });
    const activeCases = await Case.countDocuments({ 
      status: { $in: ['active', 'adjourned', 'pending_judgment'] }
    });
    const resolvedCases = await Case.countDocuments({ 
      status: { $in: ['closed', 'dismissed'] }
    });
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isSuspended: false });
    const judges = await User.countDocuments({ role: 'judge' });
    const lawyers = await User.countDocuments({ role: 'lawyer' });
    const citizens = await User.countDocuments({ role: 'citizen' });

    return {
      totalCases,
      pendingCases,
      activeCases,
      resolvedCases,
      totalUsers,
      activeUsers,
      judges,
      lawyers,
      citizens
    };
  }

  /**
   * Get cases for a user based on their role
   */
  async getCases(req, res) {
    try {
      const { status, page = 1, limit = 10, search } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let filter = {};
      if (status) {
        filter.status = status;
      }
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { caseId: { $regex: search, $options: 'i' } },
          { 'plaintiff.name': { $regex: search, $options: 'i' } },
          { 'defendant.name': { $regex: search, $options: 'i' } }
        ];
      }
      
      let cases;
      if (userRole === 'judge') {
        filter.assignedJudge = userId;
        cases = await Case.find(filter)
          .populate('assignedJudge', 'firstName lastName')
          .populate('plaintiff.lawyerId', 'firstName lastName')
          .populate('defendant.lawyerId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      } else if (userRole === 'lawyer') {
        filter.$or = [
          { 'plaintiff.lawyerId': userId },
          { 'defendant.lawyerId': userId }
        ];
        cases = await Case.find(filter)
          .populate('assignedJudge', 'firstName lastName')
          .populate('plaintiff.lawyerId', 'firstName lastName')
          .populate('defendant.lawyerId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      } else if (userRole === 'citizen') {
        const user = await User.findById(userId);
        filter.$or = [
          { 'plaintiff.contact.email': user.email },
          { 'defendant.contact.email': user.email }
        ];
        cases = await Case.find(filter)
          .populate('assignedJudge', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      } else if (userRole === 'admin') {
        cases = await Case.find(filter)
          .populate('assignedJudge', 'firstName lastName')
          .populate('plaintiff.lawyerId', 'firstName lastName')
          .populate('defendant.lawyerId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      }
      
      const total = await Case.countDocuments(filter);
      
      res.json({
        success: true,
        data: {
          cases,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      logger.error('Error getting cases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cases',
        error: error.message
      });
    }
  }

  /**
   * Get case details
   */
  async getCaseDetails(req, res) {
    try {
      const { caseId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      const caseDoc = await Case.findOne({ caseId })
        .populate('assignedJudge', 'firstName lastName email')
        .populate('plaintiff.lawyerId', 'firstName lastName email')
        .populate('defendant.lawyerId', 'firstName lastName email')
        .populate('evidenceIds')
        .populate('hearings')
        .populate('documents');
      
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }
      
      // Check access permissions
      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      res.json({
        success: true,
        data: caseDoc
      });
    } catch (error) {
      logger.error('Error getting case details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch case details',
        error: error.message
      });
    }
  }

  /**
   * Create new case
   */
  async createCase(req, res) {
    try {
      const caseData = req.body;
      
      // Generate unique case ID
      caseData.caseId = generateCaseId('CASE');
      
      const newCase = new Case(caseData);
      await newCase.save();
      
      logger.info(`New case created: ${newCase.caseId}`);
      
      res.status(201).json({
        success: true,
        message: 'Case created successfully',
        data: newCase
      });
    } catch (error) {
      logger.error('Error creating case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create case',
        error: error.message
      });
    }
  }

  /**
   * Update case status
   */
  async updateCaseStatus(req, res) {
    try {
      const { caseId } = req.params;
      const { status, reason } = req.body;
      
      const caseDoc = await Case.findOne({ caseId });
      
      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }
      
      // Check permissions
      const hasAccess = caseDoc.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      await caseDoc.updateStatus(status, reason);
      
      logger.info(`Case ${caseId} status updated to ${status}`);
      
      res.json({
        success: true,
        message: 'Case status updated successfully',
        data: caseDoc
      });
    } catch (error) {
      logger.error('Error updating case status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update case status',
        error: error.message
      });
    }
  }

  /**
   * Get hearing schedule
   */
  async getHearingSchedule(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let filter = {};
      
      if (userRole === 'judge') {
        filter.assignedJudge = userId;
      } else if (userRole === 'lawyer') {
        filter.$or = [
          { 'plaintiff.lawyerId': userId },
          { 'defendant.lawyerId': userId }
        ];
      }
      
      if (startDate && endDate) {
        filter['nextHearing.date'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      const hearings = await Case.find(filter)
        .populate('assignedJudge', 'firstName lastName')
        .populate('plaintiff.lawyerId', 'firstName lastName')
        .populate('defendant.lawyerId', 'firstName lastName')
        .sort({ 'nextHearing.date': 1 });
      
      res.json({
        success: true,
        data: hearings
      });
    } catch (error) {
      logger.error('Error getting hearing schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch hearing schedule',
        error: error.message
      });
    }
  }
}

module.exports = new CaseController();
